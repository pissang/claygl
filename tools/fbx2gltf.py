# ############################################
# fbx to glTF converter
# glTF spec : https://github.com/KhronosGroup/glTF
# fbx version 2014.2
# TODO: support python2.7
# http://github.com/pissang/
# ############################################
import sys
import struct
import json
import os.path

lib_nodes = {}
lib_lights = {}
lib_cameras = {}
lib_meshes = {}
lib_materials = {}
lib_techniques = {}
lib_images = {}
lib_samplers = {}
lib_textures = {}
lib_attributes = {}
lib_indices = {}
lib_accessors = {}
lib_buffer_views = {}
lib_buffers = {}
lib_scenes = {}

lib_skins = {}
lib_joints = {}

# FbxConverter
converter = None

# Only python 3 support bytearray ?
# http://dabeaz.blogspot.jp/2010/01/few-useful-bytearray-tricks.html
attribute_bin = bytearray()
indices_bin = bytearray()

GL_RGBA = 0x1908
GL_FLOAT = 0x1406
GL_UNSIGNED_BYTE = 0x1401
GL_UNSIGNED_SHORT = 0x1403
GL_INT = 0x1404
GL_REPEAT = 0x2901
GL_FLOAT_VEC2 = 0x8B50
GL_FLOAT_VEC3 = 0x8B51
GL_FLOAT_VEC4 = 0x8B52
GL_TEXTURE_2D = 0x0DE1
GL_TEXTURE_CUBE_MAP = 0x8513
GL_REPEAT = 0x2901
GL_CLAMP_TO_EDGE = 0x812F
GL_NEAREST = 0x2600
GL_LINEAR = 0x2601
GL_NEAREST_MIPMAP_NEAREST = 0x2700
GL_LINEAR_MIPMAP_NEAREST = 0x2701
GL_NEAREST_MIPMAP_LINEAR = 0x2702
GL_LINEAR_MIPMAP_LINEAR = 0x2703

GL_ARRAY_BUFFER = 0x8892
GL_ELEMENT_ARRAY_BUFFER = 0x8893

_id = 0
def GetId():
    global _id
    _id = _id + 1
    return _id

def CreateAttributeBuffer(pList, pType, pStride):
    lGLTFAttribute = {}

    lType = '<' + pType * pStride
    lData = []
    if len(pList) > 0:
        if pStride == 1:
            lMin = pList[0]
            lMax = pList[0]
        else:
            lMin = list(pList[0])
            lMax = list(pList[0])
    else:
        lMax = [0] * pStride
        lMin = [0] * pStride
    lRange = range(pStride)
    #TODO: Other method to write binary buffer ?
    for item in pList:
        if pStride == 1:
            lData.append(struct.pack(lType, item))
        elif pStride == 2:
            lData.append(struct.pack(lType, item[0], item[1]))
        elif pStride == 3:
            lData.append(struct.pack(lType, item[0], item[1], item[2]))
        elif pStride == 4:
            lData.append(struct.pack(lType, item[0], item[1], item[2], item[3]))
        if pStride == 1:
            lMin = min(lMin, item)
            lMax = max(lMin, item)
        else:
            for i in lRange:
                lMin[i] = min(lMin[i], item[i])
                lMax[i] = max(lMax[i], item[i])
    try:
        lData = b''.join(lData)
        lByteOffset = len(attribute_bin)
    except:
        print(lData[0])

    lKey = "accessor_" + str(GetId())

    if pType == 'f':
        lByteStride = pStride * 4
        lCount = int(len(lData) / lByteStride)
        if pStride == 1:
            lGLTFAttribute['type'] = GL_FLOAT
        elif pStride == 2:
            lGLTFAttribute['type'] = GL_FLOAT_VEC2
        elif pStride == 3:
            lGLTFAttribute['type'] = GL_FLOAT_VEC3
        elif pStride == 4:
            lGLTFAttribute['type'] = GL_FLOAT_VEC4

    else:
        print("Unsupported attribute type " + pType)
        return False

    lGLTFAttribute['byteOffset'] = lByteOffset
    lGLTFAttribute['byteStride'] = lByteStride
    lGLTFAttribute['count'] = lCount
    lGLTFAttribute['max'] = lMax
    lGLTFAttribute['min'] = lMin

    lib_attributes[lKey] = lGLTFAttribute

    attribute_bin.extend(lData)

    return lKey


def CreateIndicesBuffer(pList):

    lGLTFIndices = {}

    # Unsigned Short
    lType = '<H'
    lData = []
    for item in pList:
        lData.append(struct.pack(lType, item))

    lData = b''.join(lData)
    lByteOffset = len(indices_bin)
    lCount = int(len(lData) / 2)
    indices_bin.extend(lData)

    lKey = "accessor_" + str(GetId())
    
    lGLTFIndices['byteOffset'] = lByteOffset
    lGLTFIndices['count'] = lCount
    lGLTFIndices['type'] = GL_UNSIGNED_SHORT

    lib_indices[lKey] = lGLTFIndices

    return lKey


# PENDING : Hash mechanism may be different from COLLADA2GLTF
# TODO Cull face
# TODO Blending equation and function
def HashTechnique(pMaterial):
    if (pMaterial.ShadingModel.Get() == 'unknown'):
        return ''

    lHashStr = []
    # Is Transparent
    lHashStr.append(str(pMaterial.TransparencyFactor.Get() > 0))
    # Lambert or Phong
    lHashStr.append(str(pMaterial.ShadingModel.Get()))
    # If enable diffuse map
    lHashStr.append(str(pMaterial.Diffuse.GetSrcObjectCount() > 0))
    # If enable normal map
    lHashStr.append(str(pMaterial.NormalMap.GetSrcObjectCount() > 0))
    lHashStr.append(str(pMaterial.Bump.GetSrcObjectCount() > 0))
    # If enable alpha map
    lHashStr.append(str(pMaterial.TransparentColor.GetSrcObjectCount() > 0))

    if pMaterial.ShadingModel.Get() == 'Phong':
        # If enable specular map
        lHashStr.append(str(pMaterial.Specular.GetSrcObjectCount() > 0))
        # If enable environment map
        lHashStr.append(str(pMaterial.Reflection.GetSrcObjectCount() > 0))

    return ''.join(lHashStr)

_techniqueHashMap = {}
def CreateTechnique(pMaterial):
    if pMaterial.ShadingModel.Get() == 'unknown':
        print('Shading model of ' + pMaterial.GetName() + ' is unknown')
        lHashKey = 'technique_unknown'
    else:
        lHashKey = HashTechnique(pMaterial)
        if lHashKey in _techniqueHashMap:
            return _techniqueHashMap[lHashKey]

    lTechniqueName = 'technique_' + str(len(lib_techniques.keys()))
    _techniqueHashMap[lHashKey] = lTechniqueName
    # PENDING : Default shader ?
    # TODO Multiple pass ?
    lGLTFTechnique = {
        'parameters' : {},
        'pass' : 'defaultPass',
        'passes' : {
            'defaultPass' : {
                'instanceProgram' : {
                    'attributes' : {},
                    'program' : '',
                    'uniforms' : {}
                },
                'states' : {
                    # TODO CULL FACE
                    'cullFaceEnable' : False,
                    'depthTestEnable' : True,
                    'depthMask' : True,
                    'blendEnable' : False
                }
            }
        }
    }
    # Enable blend
    try :
        if pMaterial.TransparencyFactor.Get() < 1:
            lStates = lGLTFTechnique['passes']['defaultPass']['states']
            lStates['blendEnable'] = True
            lStates['blendEquation'] = 'FUNC_ADD'
            lStates['blendFunc'] = {
                'dfactor' : 'ONE_MINUS_SRC_ALPHA',
                'sfactor' : 'SRC_ALPHA'
            }
            lStates['depthMask'] = False
            lStates['depthTestEnable'] = True

        lib_techniques[lTechniqueName] = lGLTFTechnique
    except:
        pass

    return lTechniqueName

#PENDING Use base name as key ?
def CreateImage(pPath):
    lImageKey = [name for name in lib_images.keys() if lib_images[name]['path'] == pPath]
    if len(lImageKey):
        return lImageKey[0]
        
    lImageKey = 'image_' + str(len(lib_images.keys()))
    lib_images[lImageKey] = {
        'path' : pPath
    }
    return lImageKey

def HashSampler(pTexture):
    lHashStr = []
    # Wrap S
    lHashStr.append(str(pTexture.WrapModeU.Get()))
    # Wrap T
    lHashStr.append(str(pTexture.WrapModeV.Get()))
    return ' '.join(lHashStr)

def ConvertWrapMode(pWrap):
    if pWrap == FbxTexture.eRepeat:
        return GL_REPEAT
    elif pWrap == FbxTexture.eClamp:
        return GL_CLAMP_TO_EDGE
        
_samplerHashMap = {}
def CreateSampler(pTexture):
    lHashKey = HashSampler(pTexture)
    if lHashKey in _samplerHashMap:
        return _samplerHashMap[lHashKey]
    else:
        lSamplerName = 'sampler_' + str(len(lib_samplers.keys()))
        lib_samplers[lSamplerName] = {
            'wrapS' : ConvertWrapMode(pTexture.WrapModeU.Get()),
            'wrapT' : ConvertWrapMode(pTexture.WrapModeV.Get()),
            # Texture filter in fbx ? 
            'minFilter' : GL_LINEAR_MIPMAP_LINEAR,
            'magFilter' : GL_LINEAR
        }
        _samplerHashMap[lHashKey] = lSamplerName
        return lSamplerName

_textureHashMap = {}
_repeatedTextureCount = {}
def CreateTexture(pProperty):
    lTextureList = []
    lLayeredTextureCount = pProperty.GetSrcObjectCount(FbxCriteria.ObjectType(FbxLayeredTexture.ClassId))
    if lLayeredTextureCount > 0:
        #TODO
        pass
    else:
        lTextureCount = pProperty.GetSrcObjectCount(FbxCriteria.ObjectType(FbxTexture.ClassId))
        for t in range(lTextureCount):
            lTexture = pProperty.GetSrcObject(FbxCriteria.ObjectType(FbxTexture.ClassId), t)
            if lTexture and lTexture.__class__ == FbxFileTexture:
                lImageName = CreateImage(lTexture.GetFileName())
                lSamplerName = CreateSampler(lTexture)
                lHashKey = (lImageName, lSamplerName)
                if lHashKey in _textureHashMap:
                    lTextureList.append(_textureHashMap[lHashKey])
                else:
                    lTextureName = lTexture.GetName()
                    # Map name may be repeat
                    while lTextureName in lib_textures:
                        if not lTextureName in _repeatedTextureCount:
                            _repeatedTextureCount[lTextureName] = 0
                        else:
                            _repeatedTextureCount[lTextureName] += 1
                        lTextureName = lTextureName + '_' + str(_repeatedTextureCount[lTextureName])
                    lib_textures[lTextureName] ={
                        'format' : GL_RGBA,
                        'internalFormat' : GL_RGBA,
                        'sampler' : lSamplerName,
                        'source' : lImageName,
                        # TODO Texture Cube
                        'target' : GL_TEXTURE_2D
                    }
                    _textureHashMap[lHashKey] = lTextureName
                    lTextureList.append(lTextureName)
    # PENDING Return the first texture ?
    if lTextureList[0]:
        return lTextureList[0]
    else:
        return None

_materialHashMap = {}
_repeatedMaterialCount = {}
def ConvertMaterial(pMaterial):
    lMaterialName = pMaterial.GetName()

    lGLTFMaterial = {"name" : lMaterialName}

    # PENDING Multiple techniques ?
    lTechniqueName = CreateTechnique(pMaterial)
    lGLTFMaterial["instanceTechnique"] = {
        "technique" : lTechniqueName,
        "values" : {}
    }
    lValues = lGLTFMaterial['instanceTechnique']['values']

    lShading = pMaterial.ShadingModel.Get()

    if (lShading == 'unknown'):
        lib_materials[lMaterialName] = lGLTFMaterial
        return lMaterialName

    lValues['ambient'] = list(pMaterial.Ambient.Get())
    lValues['emission'] = list(pMaterial.Emissive.Get())

    if pMaterial.TransparencyFactor.Get() < 1:
        lValues['transparency'] = pMaterial.TransparencyFactor.Get()
    # Use diffuse map
    # TODO Diffuse Factor ?
    if pMaterial.Diffuse.GetSrcObjectCount() > 0:
        lTextureName = CreateTexture(pMaterial.Diffuse)
        if not lTextureName == None:
            lValues['diffuse'] = lTextureName
    else:
        lValues['diffuse'] = list(pMaterial.Diffuse.Get())

    if pMaterial.Bump.GetSrcObjectCount() > 0:
        # FIXME 3dsmax use the normal map as bump map ?
        lTextureName = CreateTexture(pMaterial.Bump)
        if not lTextureName == None:
            lValues['normalMap'] = lTextureName

    if pMaterial.NormalMap.GetSrcObjectCount() > 0:
        lTextureName = CreateTexture(pMaterial.NormalMap)
        if not lTextureName == None:
            lValues['normalMap'] = lTextureName

    if lShading == 'phong':
        lValues['shininess'] = pMaterial.Shininess.Get();
        # Use specular map
        # TODO Specular Factor ?
        if pMaterial.Specular.GetSrcObjectCount() > 0:
            pass
        else:
            lValues['specular'] = list(pMaterial.Specular.Get())

    # Material name of different material may be same after SplitMeshByMaterial
    lHashKey = [lMaterialName]
    for lKey in lValues.keys():
        lValue = lValues[lKey];
        lHashKey.append(lKey)
        lHashKey.append(str(lValue))
    lHashKey = tuple(lHashKey)
    if lHashKey in _materialHashMap:
        return _materialHashMap[lHashKey];

    while lMaterialName in lib_materials:
        if not lMaterialName in _repeatedMaterialCount:
            _repeatedMaterialCount[lMaterialName] = 0
        else:
            _repeatedMaterialCount[lMaterialName] += 1
        lMaterialName = lMaterialName + '_' + str(_repeatedMaterialCount[lMaterialName])
    _materialHashMap[lHashKey] =  lMaterialName

    lGLTFMaterial['name'] = lMaterialName
    lib_materials[lMaterialName] = lGLTFMaterial
    return lMaterialName

def ConvertVertexLayer(pMesh, pLayer, pOutput):
    lMappingMode = pLayer.GetMappingMode()
    lReferenceMode = pLayer.GetReferenceMode()

    if lMappingMode == FbxLayerElement.eByControlPoint:
        if lReferenceMode == FbxLayerElement.eDirect:
            for vec in pLayer.GetDirectArray():
                pOutput.append(vec)
        elif lReferenceMode == FbxLayerElement.eIndexToDirect:
            lIndexArray = pLayer.GetIndexArray()
            lDirectArray = pLayer.GetDirectArray()
            for idx in lIndexArray:
                pOutput.append(lDirectArray.GetAt(idx))

        return False
    elif lMappingMode == FbxLayerElement.eByPolygonVertex:
        if lReferenceMode == FbxLayerElement.eDirect:
            for vec in pLayer.GetDirectArray():
                pOutput.append(vec)
        # Need to split vertex
        # TODO: Normal per vertex will still have ByPolygonVertex in COLLADA
        elif lReferenceMode == FbxLayerElement.eIndexToDirect:
            lIndexArray = pLayer.GetIndexArray()
            lDirectArray = pLayer.GetDirectArray()
            for idx in lIndexArray:
                pOutput.append(lDirectArray.GetAt(idx))
        else:
            print("Unsupported mapping mode " + lMappingMode)

        return True

def CreateSkin():
    lSkinName = "skin_" + str(len(lib_skins.keys()))
    # https://github.com/KhronosGroup/glTF/issues/100
    lib_skins[lSkinName] = {
        # TODO
        'bindShapeMatrix' : [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],
        # 'bindShapeMatrix' : [],
        # 'inverseBindMatrices' : {},
        'joints' : [],
        'roots' : []
    }

    return lSkinName

def ConvertMesh(pMesh, pNode):
    lGLTFPrimitive = {}
    lPositions = []
    lNormals = []
    lTexcoords = []
    lIndices = []

    lWeights = []
    lJoints = []
    # Count joint number of each vertex
    lJointCounts = []

    # Only consider layer 0
    lLayer = pMesh.GetLayer(0)
    if lLayer:
        ## Handle material
        lLayerMaterial = lLayer.GetMaterials()
        if lLayerMaterial == None:
            print("Mesh " + pNode.GetName() + " doesn't have material")
            return None;
        # Mapping Mode of material must be eAllSame
        # Because the mesh has been splitted by material
        idx = lLayerMaterial.GetIndexArray()[0];
        lMaterial = pNode.GetMaterial(idx)
        lMaterialKey = ConvertMaterial(lMaterial)
        lGLTFPrimitive["material"] = lMaterialKey

        ## Handle normals
        lLayerNormal = lLayer.GetNormals()
        lNormalSplitted = ConvertVertexLayer(pMesh, lLayerNormal, lNormals)

        ## Handle uvs
        lLayerUV = lLayer.GetUVs()
        if not lLayerUV == None:
            lUVSPlitted = ConvertVertexLayer(pMesh, lLayerUV, lTexcoords)
        else:
            lUVSPlitted = True

        hasSkin = False;
        ## Handle Skinning data
        if (pMesh.GetDeformerCount(FbxDeformer.eSkin) > 0):
            hasSkin = True;
            lControlPointsCount = pMesh.GetControlPointsCount()
            for i in range(lControlPointsCount):
                lWeights.append([0, 0, 0])
                lJoints.append([-1, -1, -1, -1])
                lJointCounts.append(0)

            for i in range(pMesh.GetDeformerCount(FbxDeformer.eSkin)):
                lDeformer = pMesh.GetDeformer(i, FbxDeformer.eSkin)
                lGLTFSkinName = CreateSkin()
                lGLTFSkin = lib_skins[lGLTFSkinName]
                # Put instance skin in primitive
                # Because eache primitive is a single draw call. So it is necessary to put skin and 
                # vertex data(jointIndices) in one primitive to keep the joint indices consistent
                # PENDING in https://github.com/KhronosGroup/glTF/issues/100 put the instanceSkin in node
                lGLTFPrimitive['skin'] = lGLTFSkinName

                lLinks = {}
                for i2 in range(lDeformer.GetClusterCount()):
                    lCluster = lDeformer.GetCluster(i2)
                    lLink = lCluster.GetLink()
                    lGLTFSkin['joints'].append(lLink.GetName())
                    lLinks[lLink.GetName()] = lLink

                    lControlPointIndices = lCluster.GetControlPointIndices()
                    lControlPointWeights = lCluster.GetControlPointWeights()
                    for i3 in range(lCluster.GetControlPointIndicesCount()):
                        lControlPointIndex = lControlPointIndices[i3]
                        lControlPointWeight = lControlPointWeights[i3]
                        lJointCount = lJointCounts[lControlPointIndex]
                        # At most binding four joint per vertex
                        if lJointCount <= 3:
                            # Joint index
                            lJoints[lControlPointIndex][lJointCount] = i2
                            # Weight is FLOAT_3 because it is normalized
                            if lJointCount < 3:
                                lWeights[lControlPointIndex][lJointCount] = lControlPointWeight
                            lJointCounts[lControlPointIndex] += 1

                # Find Root
                # which do not have a parent or its parent is not in skin
                # TODO IsSkeletonRoot not works well
                for lJointName in lGLTFSkin['joints']:
                    lLink = lLinks[lJointName]
                    lParent = lLink.GetParent()
                    if lParent == None or not lParent.GetName() in lGLTFSkin['joints']:
                        if not lParent.GetName() in lGLTFSkin['roots']:
                            lGLTFSkin['roots'].append(lLink.GetName())

        if lNormalSplitted or lUVSPlitted:
            lCount = 0
            lVertexCount = 0
            lNormalsTmp = []
            lTexcoordsTmp = []
            lJointsTmp = []
            lWeightsTmp = []
            lVertexMap = {}

            for idx in pMesh.GetPolygonVertices():
                lPosition = pMesh.GetControlPointAt(idx)
                if not lNormalSplitted:
                    # Split normal data
                    lNormal = lNormals[idx]
                else:
                    lNormal = lNormals[lCount]
                if not lUVSPlitted:
                    lTexcoord = lTexcoords[idx]
                elif not lLayerUV == None:
                    lTexcoord = lTexcoords[lCount]
                lCount += 1
                #Compress vertex, hashed with position and normal
                lKey = (lPosition[0], lPosition[1], lPosition[2], lNormal[0], lNormal[1], lNormal[2])
                if lKey in lVertexMap:
                    lIndices.append(lVertexMap[lKey])
                else:
                    lPositions.append(lPosition)
                    lNormalsTmp.append(lNormal)
                    if not lLayerUV == None:
                        lTexcoordsTmp.append(lTexcoord)
                    if hasSkin:
                        lWeightsTmp.append(lWeights[idx])
                        lJointsTmp.append(lJoints[idx])
                    lIndices.append(lVertexCount)
                    lVertexMap[lKey] = lVertexCount
                    lVertexCount += 1

            lNormals = lNormalsTmp
            lTexcoords = lTexcoordsTmp
            if hasSkin:
                lWeights = lWeightsTmp
                lJoints = lJointsTmp
        else:
            lIndices = pMesh.GetPolygonVertices()
            lPositions = pMesh.GetControlPoints()

        lGLTFPrimitive['attributes'] = {}
        lGLTFPrimitive['attributes']['POSITION'] = CreateAttributeBuffer(lPositions, 'f', 3)
        lGLTFPrimitive['attributes']['NORMAL'] = CreateAttributeBuffer(lNormals, 'f', 3)
        if not lLayerUV == None:
            lGLTFPrimitive['attributes']['TEXCOORD_0'] = CreateAttributeBuffer(lTexcoords, 'f', 2)
        if hasSkin:
            # PENDING Joint indices use other data type ?
            lGLTFPrimitive['attributes']['JOINT'] = CreateAttributeBuffer(lJoints, 'f', 4)
            lGLTFPrimitive['attributes']['WEIGHT'] = CreateAttributeBuffer(lWeights, 'f', 3)

        lGLTFPrimitive['indices'] = CreateIndicesBuffer(lIndices)

        return lGLTFPrimitive
    else:
        return None

def ConvertLight(pLight):
    lGLTFLight = {}
    # In fbx light's name is empty ?
    if pLight.GetName() == "":
        lLightName = "light_" + str(len(lib_lights.keys()))
    else:
        lLightName = pLight.GetName() + '-light'

    lGLTFLight['id'] = lLightName

    # PENDING Consider Intensity ?
    lightColor = pLight.Color.Get()
    # PENDING Why have a id property here(not name, and camera don't have)
    lLightType = pLight.LightType.Get()
    if lLightType == FbxLight.ePoint:
        lGLTFLight['type'] = 'point'
        lGLTFLight['point'] = {
            'color' : list(lightColor),
            # TODO
            "constantAttenuation": 1,
            "linearAttenuation": 0,
            "quadraticAttenuation": 0.00159997
        }
        pass
    elif lLightType == FbxLight.eDirectional:
        lGLTFLight['type'] = 'directional'
        lGLTFLight['directional'] = {
            'color' : list(lightColor)
        }
    elif lLightType == FbxLight.eSpot:
        lGLTFLight['type'] = 'spot'
        lGLTFLight['spot'] = {
            'color' : list(lightColor),
            # InnerAngle can be zero, so we use outer angle here
            'fallOffAngle' : pLight.OuterAngle.Get(),
            "fallOffExponent": 0.15,
            # TODO
            "constantAttenuation": 1,
            "linearAttenuation": 0,
            "quadraticAttenuation": 0.00159997
        }

    lib_lights[lLightName] = lGLTFLight

    return lLightName

def ConvertCamera(pCamera):
    lGLTFCamera = {}

    if pCamera.ProjectionType.Get() == FbxCamera.ePerspective:
        lGLTFCamera['projection'] = 'perspective'
        lGLTFCamera['xfov'] = pCamera.FieldOfView.Get()
    elif pCamera.ProjectionType.Get() == FbxCamera.eOrthogonal:
        lGLTFCamera['projection'] = 'orthographic'
        # TODO
        lGLTFCamera['xmag'] = 1.0
        lGLTFCamera['ymag'] = 1.0

    lGLTFCamera['znear'] = pCamera.NearPlane.Get()
    lGLTFCamera['zfar'] = pCamera.FarPlane.Get()

    # In fbx camera's name is empty ?
    if pCamera.GetName() == '':
        lCameraName = 'camera_' + str(len(lib_cameras.keys()))
    else:
        lCameraName = pCamera.GetName() + '-camera'
    lib_cameras[lCameraName] = lGLTFCamera
    return lCameraName

def TraverseSceneNode(pNode):
    lGLTFNode = {}
    lNodeName = pNode.GetName()
    lGLTFNode['name'] = lNodeName
    lib_nodes[lNodeName] = lGLTFNode

    # Transform matrix
    m = pNode.EvaluateLocalTransform()
    lGLTFNode['matrix'] = [
        m[0][0], m[0][1], m[0][2], m[0][3],
        m[1][0], m[1][1], m[1][2], m[1][3],
        m[2][0], m[2][1], m[2][2], m[2][3],
        m[3][0], m[3][1], m[3][2], m[3][3],
    ]
    #PENDING : Triangulate and split all geometry not only the default one ?
    #PENDING : Multiple node use the same mesh ?
    lGeometry = pNode.GetGeometry()
    if lGeometry:
        lMeshKey = lNodeName + '-mesh'
        lMeshName = lGeometry.GetName()
        if lMeshName == '':
            lMeshName = lMeshKey

        lGLTFMesh = lib_meshes[lMeshKey] = {'name' : lMeshName, 'primitives' : []}

        lGeometry = converter.Triangulate(lGeometry, True)
        # FIXME SplitMeshPerMaterial may loss deformer in mesh
        # lResult = converter.SplitMeshPerMaterial(lGeometry, True)

        lNodeAttribute = pNode.GetNodeAttribute()
        if lNodeAttribute.GetAttributeType() == FbxNodeAttribute.eMesh:
            lPrimitive = ConvertMesh(lNodeAttribute, pNode)
            if not lPrimitive == None:
                lGLTFMesh["primitives"].append(lPrimitive)
                # Have skinning data
                if 'skin' in lPrimitive:
                    lSkinName = lPrimitive['skin']
                    lSkin = lib_skins[lSkinName]
                    lPrimitive.pop('skin')
                    lGLTFNode['instanceSkin'] = {
                        'skeletons' : lSkin['roots'],
                        'skin' : lSkinName,
                        'sources' : [lMeshKey]
                    }
                else:
                    lGLTFNode['meshes'] = [lMeshKey]
                
    else:
        # Camera and light node attribute
        lNodeAttribute = pNode.GetNodeAttribute()
        if not lNodeAttribute == None:
            lAttributeType = lNodeAttribute.GetAttributeType()
            if lAttributeType == FbxNodeAttribute.eCamera:
                lCameraKey = ConvertCamera(lNodeAttribute)
                lGLTFNode['camera'] = lCameraKey
            elif lAttributeType == FbxNodeAttribute.eLight:
                lLightKey = ConvertLight(lNodeAttribute)
                lGLTFNode['lights'] = [lLightKey]
            elif lAttributeType == FbxNodeAttribute.eSkeleton:
                # Use node name as joint id
                lGLTFNode['jointId'] = lNodeName
                lib_joints[lNodeName] = lGLTFNode

    lGLTFNode['children'] = []
    for i in range(pNode.GetChildCount()):
        lChildNodeName = TraverseSceneNode(pNode.GetChild(i))
        lGLTFNode['children'].append(lChildNodeName)

    return lNodeName

def TraverseScene(pScene):
    lRoot = pScene.GetRootNode()

    lSceneName = pScene.GetName()
    if lSceneName == "":
        lSceneName = "scene_" + str(len(lib_scenes.keys()))

    lGLTFScene = lib_scenes[lSceneName] = {"nodes" : []}

    for i in range(lRoot.GetChildCount()):
        lNodeName = TraverseSceneNode(lRoot.GetChild(i))
        lGLTFScene['nodes'].append(lNodeName)

    return lSceneName

def ConvertScene(pScene):
    return TraverseScene(pScene)

def CreateBufferViews(pBufferName):
    #Attribute buffer view
    lBufferViewName = 'bufferView_' + str(GetId())
    lBufferView = lib_buffer_views[lBufferViewName] = {}
    lBufferView['buffer'] = pBufferName
    lBufferView['byteLength'] = len(attribute_bin)
    lBufferView['byteOffset'] = 0
    lBufferView['target'] = GL_ARRAY_BUFFER

    for lKey, lAttrib in lib_attributes.items():
        lAttrib['bufferView'] = lBufferViewName
        lib_accessors[lKey] = lAttrib

    #Indices buffer view
    lBufferViewName = 'bufferView_' + str(GetId())
    lBufferView = lib_buffer_views[lBufferViewName] = {}
    lBufferView['buffer'] = pBufferName
    lBufferView['byteLength'] = len(indices_bin)
    lBufferView['byteOffset'] = len(attribute_bin)
    lBufferView['target'] = GL_ELEMENT_ARRAY_BUFFER

    for lKey, lIndices in lib_indices.items():
        lIndices['bufferView'] = lBufferViewName
        lib_accessors[lKey] = lIndices

if __name__ == "__main__":
    try:
        from FbxCommon import *
    except ImportError:
        import platform
        msg = 'You need to copy the content in compatible subfolder under /lib/python<version> into your python install folder such as '
        if platform.system() == 'Windows' or platform.system() == 'Microsoft':
            msg += '"Python26/Lib/site-packages"'
        elif platform.system() == 'Linux':
            msg += '"/usr/local/lib/python2.6/site-packages"'
        elif platform.system() == 'Darwin':
            msg += '"/Library/Frameworks/Python.framework/Versions/2.6/lib/python2.6/site-packages"'        
        msg += ' folder.'
        print(msg) 
        sys.exit(1)

    # Prepare the FBX SDK.
    lSdkManager, lScene = InitializeSdkObjects()
    converter = FbxGeometryConverter(lSdkManager)
    # Load the scene.
    if len(sys.argv) > 1:
        lResult = LoadScene(lSdkManager, lScene, sys.argv[1])

    else:
        lResult = False
        print("\n\nUsage: fbx2gltf <FBX file name>\n")

    if not lResult:
        print("\n\nAn error occurred while loading the scene...")
    else:
        lBaseName = os.path.splitext(os.path.basename(sys.argv[1]))[0]
        lRoot, lExt = os.path.splitext(sys.argv[1])

        lSceneName = ConvertScene(lScene)

        #Merge binary data and write to a binary file
        lBin = bytearray()
        lBin.extend(attribute_bin)
        lBin.extend(indices_bin)
        out = open(lRoot + ".bin", 'wb')
        out.write(lBin)
        out.close()

        lBufferName = lBaseName + '.bin'
        lib_buffers[lBufferName] = {'byteLength' : len(lBin), 'path' : lBufferName}

        CreateBufferViews(lBufferName)

        # Remove roots property in lib_skin
        for lSkinName in lib_skins.keys():
            lib_skins[lSkinName].pop('roots')
        #Output json
        lOutput = {
            'animations' : {},
            'asset' : {},
            'shaders' : {},
            'accessors' : lib_accessors,
            'bufferViews' : lib_buffer_views,
            'buffers' : lib_buffers,
            'textures' : lib_textures,
            'samplers' : lib_samplers,
            'images' : lib_images,
            'materials' : lib_materials,
            'techniques' : lib_techniques,
            'nodes' : lib_nodes,
            'cameras' : lib_cameras,
            'lights' : lib_lights,
            'scenes' : lib_scenes,
            'meshes' : lib_meshes,
            'skins' : lib_skins,
            #Default scene
            'scene' : lSceneName
        }

        out = open(lRoot + ".json", 'w')
        out.write(json.dumps(lOutput, indent=4, sort_keys = True, separators=(',', ': ')))
        out.close()
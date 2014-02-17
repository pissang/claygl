# ############################################
# fbx to glTF converter
# glTF spec : https://github.com/KhronosGroup/glTF
# fbx version 2014.2
# TODO: support python2.7
# TODO: 2014.2 python3.3 LoadScene is too slow
# http://github.com/pissang/
# ############################################
import sys
import struct
import json
import os.path
import math

lib_materials = {}
lib_techniques = {}

lib_images = {}
lib_samplers = {}
lib_textures = {}

# attributes, indices, anim_parameters will be merged in accessors
lib_attributes = {}
lib_indices = {}
lib_parameters = {}
lib_accessors = {}

lib_buffer_views = {}
lib_buffers = {}

lib_lights = {}
lib_cameras = {}
lib_meshes = {}

lib_nodes = {}
lib_scenes = {}

lib_skins = {}
lib_joints = {}

lib_animations = {}

# Only python 3 support bytearray ?
# http://dabeaz.blogspot.jp/2010/01/few-useful-bytearray-tricks.html
attributeBuffer = bytearray()
indicesBuffer = bytearray()
invBindMatricesBuffer = bytearray()
animationBuffer = bytearray()

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

def CreateAccessorBuffer(pList, pType, pStride, minMax = False):
    lGLTFAcessor = {}

    lType = '<' + pType * pStride
    lData = []

    if minMax:
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
        if minMax:
            if pStride == 1:
                lMin = min(lMin, item)
                lMax = max(lMin, item)
            else:
                for i in lRange:
                    lMin[i] = min(lMin[i], item[i])
                    lMax[i] = max(lMax[i], item[i])

    if pType == 'f':
        lByteStride = pStride * 4
        if pStride == 1:
            lGLTFAcessor['type'] = GL_FLOAT
        elif pStride == 2:
            lGLTFAcessor['type'] = GL_FLOAT_VEC2
        elif pStride == 3:
            lGLTFAcessor['type'] = GL_FLOAT_VEC3
        elif pStride == 4:
            lGLTFAcessor['type'] = GL_FLOAT_VEC4
    
    # Unsigned Short
    elif pType == 'H':
        lByteStride = pStride * 2
        lGLTFAcessor['type'] = GL_UNSIGNED_SHORT

    lGLTFAcessor['byteOffset'] = 0
    lGLTFAcessor['byteStride'] = lByteStride
    lGLTFAcessor['count'] = len(pList)

    if minMax:
        lGLTFAcessor['max'] = lMax
        lGLTFAcessor['min'] = lMin

    return b''.join(lData), lGLTFAcessor


def CreateAttributeBuffer(pList, pType, pStride):
    lData, lGLTFAttribute = CreateAccessorBuffer(pList, pType, pStride, True)
    lGLTFAttribute['byteOffset'] = len(attributeBuffer)
    attributeBuffer.extend(lData)
    lKey = 'attrbute_' + str(GetId())
    lib_attributes[lKey] = lGLTFAttribute
    return lKey


def CreateIndicesBuffer(pList):
    lData, lGLTFIndices = CreateAccessorBuffer(pList, 'H', 1, False)
    lGLTFIndices['byteOffset'] = len(indicesBuffer)
    indicesBuffer.extend(lData)
    lKey = 'indices_' + str(GetId())
    lib_indices[lKey] = lGLTFIndices
    lGLTFIndices.pop('byteStride')
    return lKey

def CreateAnimationBuffer(pList, pType, pStride):
    lData, lGLTFParameter = CreateAccessorBuffer(pList, pType, pStride, False)
    lGLTFParameter['byteOffset'] = len(animationBuffer)
    animationBuffer.extend(lData)
    lKey = 'accessor_' + str(GetId())
    lib_parameters[lKey] = lGLTFParameter
    lGLTFParameter.pop('byteStride')
    return lKey

def QuaternionToAxisAngle(pQuat):
    w = pQuat[3]
    if (w == 1):
        return [1, 0, 0, 0]

    divider = 1 / math.sqrt((1 - w * w))
    angle = 2 * math.acos(w)
    x = pQuat[0] * divider
    y = pQuat[1] * divider
    z = pQuat[2] * divider

    return [x, y, z, angle]

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
        # Old fbx version transparency is 0 if object is opaque
        if pMaterial.TransparencyFactor.Get() < 1 and pMaterial.TransparencyFactor.Get() > 0:
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

    lFileTextures = []
    lLayeredTextureCount = pProperty.GetSrcObjectCount(FbxLayeredTexture.ClassId)
    if lLayeredTextureCount > 0:
        for i in range(lLayeredTextureCount):
            lLayeredTexture = pProperty.GetSrcObject(FbxLayeredTexture.ClassId, i)
            for j in range(lLayeredTexture.GetSrcObjectCount(FbxTexture.ClassId)):
                lTexture = lLayeredTexture.GetSrcObject(FbxTexture.ClassId, j)
                if lTexture and lTexture.__class__ == FbxFileTexture:
                    lFileTextures.append(lTexture)
        pass
    else:
        lTextureCount = pProperty.GetSrcObjectCount(FbxTexture.ClassId)
        for t in range(lTextureCount):
            lTexture = pProperty.GetSrcObject(FbxTexture.ClassId, t)
            if lTexture and lTexture.__class__ == FbxFileTexture:
                lFileTextures.append(lTexture)

    for lTexture in lFileTextures:
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
    if len(lTextureList) > 0:
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
        # Old fbx version transparency is 0 if object is opaque
        if (lValues['transparency'] == 0):
            lValues['transparency'] = 1

    # Use diffuse map
    # TODO Diffuse Factor ?
    if pMaterial.Diffuse.GetSrcObjectCount() > 0:
        lTextureName = CreateTexture(pMaterial.Diffuse)
        if not lTextureName == None:
            lValues['diffuse'] = lTextureName
    else:
        lValues['diffuse'] = list(pMaterial.Diffuse.Get())

    if pMaterial.Bump.GetSrcObjectCount() > 0:
        # TODO 3dsmax use the normal map as bump map ?
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
        'inverseBindMatrices' : {
            "count" : 0,
            "byteOffset" : len(invBindMatricesBuffer),
            "type" : GL_FLOAT
        },
        'joints' : [],
    }

    return lSkinName

def ConvertMesh(pMesh, pNode, pSkin, pClusters):
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

                for i2 in range(lDeformer.GetClusterCount()):
                    lCluster = lDeformer.GetCluster(i2)
                    lNode = lCluster.GetLink()
                    lJointIndex = -1
                    if not lNode.GetName() in pSkin['joints']:
                        lJointIndex = len(pSkin['joints'])
                        pSkin['joints'].append(lNode.GetName())

                        pClusters[lNode.GetName()] = lCluster
                    else:
                        lJointIndex = pSkin['joints'].index(lNode.GetName())

                    lControlPointIndices = lCluster.GetControlPointIndices()
                    lControlPointWeights = lCluster.GetControlPointWeights()
                    for i3 in range(lCluster.GetControlPointIndicesCount()):
                        lControlPointIndex = lControlPointIndices[i3]
                        lControlPointWeight = lControlPointWeights[i3]
                        lJointCount = lJointCounts[lControlPointIndex]
                        # At most binding four joint per vertex
                        if lJointCount <= 3:
                            # Joint index
                            lJoints[lControlPointIndex][lJointCount] = lJointIndex
                            # Weight is FLOAT_3 because it is normalized
                            if lJointCount < 3:
                                lWeights[lControlPointIndex][lJointCount] = lControlPointWeight
                            lJointCounts[lControlPointIndex] += 1

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

def ConvertSceneNode(pNode, fbxConverter):
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
    if not lGeometry == None:
        lMeshKey = lNodeName + '-mesh'
        lMeshName = lGeometry.GetName()
        if lMeshName == '':
            lMeshName = lMeshKey

        lGLTFMesh = lib_meshes[lMeshKey] = {'name' : lMeshName, 'primitives' : []}

        fbxConverter.Triangulate(lGeometry, True)
        # TODO SplitMeshPerMaterial may loss deformer in mesh
        # FBX version 2014.2 seems have fixed it
        fbxConverter.SplitMeshPerMaterial(lGeometry, True)

        lHasSkin = False
        lGLTFSkin = None
        lClusters = {}
        lSkinName = ''

        # If any attribute of this node have skinning data
        # (Mesh splitted by material may have multiple MeshAttribute in one node)
        for i in range(pNode.GetNodeAttributeCount()):
            lNodeAttribute = pNode.GetNodeAttributeByIndex(i)
            if lNodeAttribute.GetAttributeType() == FbxNodeAttribute.eMesh:
                if (lNodeAttribute.GetDeformerCount(FbxDeformer.eSkin) > 0):
                    lHasSkin = True
        if lHasSkin:
            lSkinName = CreateSkin()
            lGLTFSkin = lib_skins[lSkinName]

        for i in range(pNode.GetNodeAttributeCount()):
            lNodeAttribute = pNode.GetNodeAttributeByIndex(i)
            if lNodeAttribute.GetAttributeType() == FbxNodeAttribute.eMesh:
                lPrimitive = ConvertMesh(lNodeAttribute, pNode, lGLTFSkin, lClusters)
                if not lPrimitive == None:
                    lGLTFMesh["primitives"].append(lPrimitive)

        if lHasSkin:
            roots = []
            lGLTFNode['instanceSkin'] = {
                'skeletons' : roots,
                'skin' : lSkinName,
                'sources' : [lMeshKey]
            }
            # Find Root
            # which do not have a parent or its parent is not in skin
            # TODO IsSkeletonRoot not works well
            for lJointName in lGLTFSkin['joints']:
                lCluster = lClusters[lJointName]
                lLink = lCluster.GetLink()
                lParent = lLink.GetParent()
                if lParent == None or not lParent.GetName() in lGLTFSkin['joints']:
                    if not lParent.GetName() in roots:
                        roots.append(lLink.GetName())

            #Find root
            lRootCluster = lClusters[roots[0]]
            lRootNode = lRootCluster.GetLink().GetParent()
            lRootNodeTransform = lRootNode.EvaluateGlobalTransform()

            lClusterGlobalInitMatrix = FbxAMatrix()
            lReferenceGlobalInitMatrix = FbxAMatrix()

            for i in range(len(lGLTFSkin['joints'])):
                lJointName = lGLTFSkin['joints'][i]
                lCluster = lClusters[lJointName]

                lLink = lCluster.GetLink()
                # Inverse Bind Pose Matrix
                lCluster.GetTransformMatrix(lReferenceGlobalInitMatrix)
                lCluster.GetTransformLinkMatrix(lClusterGlobalInitMatrix)
                # Matrix in fbx is column major
                # (root-1 * reference-1 * cluster)-1 = cluster-1 * reference * root
                m = lClusterGlobalInitMatrix.Inverse() * lReferenceGlobalInitMatrix * lRootNodeTransform
                invBindMatricesBuffer.extend(struct.pack('<'+'f' * 16,  m[0][0], m[0][1], m[0][2], m[0][3], m[1][0], m[1][1], m[1][2], m[1][3], m[2][0], m[2][1], m[2][2], m[2][3], m[3][0], m[3][1], m[3][2], m[3][3]))
                lGLTFSkin['inverseBindMatrices']['count'] += 1

            # PENDING
            lGLTFNode['matrix'] = [
                1, 0, 0, 0,
                0, 1, 0, 0,
                0, 0, 1, 0,
                0, 0, 0, 1,
            ]
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
        lChildNodeName = ConvertSceneNode(pNode.GetChild(i), fbxConverter)
        lGLTFNode['children'].append(lChildNodeName)

    return lNodeName

def ConvertScene(pScene, fbxConverter):
    lRoot = pScene.GetRootNode()

    lSceneName = pScene.GetName()
    if lSceneName == "":
        lSceneName = "scene_" + str(len(lib_scenes.keys()))

    lGLTFScene = lib_scenes[lSceneName] = {"nodes" : []}

    for i in range(lRoot.GetChildCount()):
        lNodeName = ConvertSceneNode(lRoot.GetChild(i), fbxConverter)
        lGLTFScene['nodes'].append(lNodeName)

    return lSceneName

def CreateAnimation():
    lAnimName = 'animation_' + str(len(lib_animations.keys()))
    lGLTFAnimation = {
        'channels' : [],
        'count' : 0,
        'parameters' : {},
        'samplers' : {} 
    }
    lib_animations[lAnimName] = lGLTFAnimation

    return lAnimName, lGLTFAnimation

_samplerChannels = ['rotation', 'scale', 'translation']
def CreateTransformAnimation(nodeName):
    lAnimName, lGLTFAnimation = CreateAnimation()

    lGLTFAnimation['parameters'] = {
        "TIME" : None,
        "rotation" : None,
        "scale" : None,
        "translation" : None
    }
    #TODO Other interpolation methods
    for path in _samplerChannels:
        lSamplerName = lAnimName + '_' + path + '_sampler'
        lGLTFAnimation['samplers'][lSamplerName] = {
            "input": "TIME",
            "interpolation": "LINEAR",
            "output": path
        }
        lGLTFAnimation['channels'].append({
            "sampler" : lSamplerName,
            "target" : {
                "id" : nodeName,
                "path" : path
            }
        })

    return lAnimName, lGLTFAnimation

def ConvertNodeAnimation(pAnimLayer, pNode, pSampleRate):
    lNodeName = pNode.GetName()

    # Find start and end time of animation layer
    # Use the time of X channel of translation curve
    lAnimCurve = pNode.LclTranslation.GetCurve(pAnimLayer, 'X')
    if lAnimCurve == None:
        return;

    lTimeSpan = FbxTimeSpan()
    lAnimCurve.GetTimeInterval(lTimeSpan)
    lStartTimeDouble = lTimeSpan.GetStart().GetSecondDouble()
    lEndTimeDouble = lTimeSpan.GetStop().GetSecondDouble()
    lDuration = lEndTimeDouble - lStartTimeDouble

    if lDuration > 1e-5:
        lAnimName, lGLTFAnimation = CreateTransformAnimation(lNodeName)

        lNumFrames = math.ceil(lDuration / pSampleRate)

        lTime = FbxTime()

        lTimeChannel = []
        lTranslationChannel = []
        lRotationChannel = []
        lScaleChannel = []

        lQuaternion = FbxQuaternion()
        for i in range(lNumFrames):
            lSecondDouble = min(lStartTimeDouble + pSampleRate * i, lEndTimeDouble)
            lTime.SetSecondDouble(lSecondDouble)

            lTransform = pNode.EvaluateLocalTransform(lTime)
            lTranslation = lTransform.GetT()
            lQuaternion = lTransform.GetQ()
            lScale = lTransform.GetS()

            #Convert quaternion to axis angle
            lRotationChannel.append(QuaternionToAxisAngle(lQuaternion))

            lTimeChannel.append(lSecondDouble)
            lTranslationChannel.append(list(lTranslation))
            lScaleChannel.append(list(lScale))

        lGLTFAnimation['count'] = lNumFrames
        lGLTFAnimation['parameters']['TIME'] = CreateAnimationBuffer(lTimeChannel, 'f', 1)
        lGLTFAnimation['parameters']['rotation'] = CreateAnimationBuffer(lRotationChannel, 'f', 4)
        lGLTFAnimation['parameters']['translation'] = CreateAnimationBuffer(lTranslationChannel, 'f', 3)
        lGLTFAnimation['parameters']['scale'] = CreateAnimationBuffer(lScaleChannel, 'f', 3)

    for i in range(pNode.GetChildCount()):
        ConvertNodeAnimation(pAnimLayer, pNode.GetChild(i), pSampleRate)

def ConvertAnimation(pScene, pSampleRate):
    lRoot = pScene.GetRootNode()
    for i in range(pScene.GetSrcObjectCount(FbxAnimStack.ClassId)):
        lAnimStack = pScene.GetSrcObject(FbxAnimStack.ClassId, i)
        for j in range(lAnimStack.GetSrcObjectCount(FbxAnimLayer.ClassId)):
            lAnimLayer = lAnimStack.GetSrcObject(FbxAnimLayer.ClassId, j)
            for k in range(lRoot.GetChildCount()):
                ConvertNodeAnimation(lAnimLayer, lRoot.GetChild(k), pSampleRate)


def CreateBufferViews(pBufferName):
    lByteOffset = 0

    #Attribute buffer view
    lBufferViewName = 'bufferView_' + str(GetId())
    lBufferView = lib_buffer_views[lBufferViewName] = {}
    lBufferView['buffer'] = pBufferName
    lBufferView['byteLength'] = len(attributeBuffer)
    lBufferView['byteOffset'] = lByteOffset
    lBufferView['target'] = GL_ARRAY_BUFFER

    for lKey, lAttrib in lib_attributes.items():
        lAttrib['bufferView'] = lBufferViewName
        lib_accessors[lKey] = lAttrib

    lByteOffset += lBufferView['byteLength']

    #Indices buffer view
    lBufferViewName = 'bufferView_' + str(GetId())
    lBufferView = lib_buffer_views[lBufferViewName] = {}
    lBufferView['buffer'] = pBufferName
    lBufferView['byteLength'] = len(indicesBuffer)
    lBufferView['byteOffset'] = lByteOffset
    lBufferView['target'] = GL_ELEMENT_ARRAY_BUFFER

    for lKey, lIndices in lib_indices.items():
        lIndices['bufferView'] = lBufferViewName
        lib_accessors[lKey] = lIndices

    lByteOffset += lBufferView['byteLength']

    #Inverse Bind Pose Matrices
    if len(invBindMatricesBuffer) > 0:
        lBufferViewName = 'bufferView_' + str(GetId())
        lBufferView = lib_buffer_views[lBufferViewName] = {}
        lBufferView['buffer'] = pBufferName
        lBufferView['byteLength'] = len(invBindMatricesBuffer)
        lBufferView['byteOffset'] = lByteOffset

        for lSkin in lib_skins.values():
            lSkin['inverseBindMatrices']['bufferView'] = lBufferViewName

        lByteOffset += lBufferView['byteLength']

    #Animations
    if len(animationBuffer) > 0:
        lBufferViewName = 'bufferView_' + str(GetId())
        lBufferView = lib_buffer_views[lBufferViewName] = {}
        lBufferView['buffer'] = pBufferName
        lBufferView['byteLength'] = len(animationBuffer)
        lBufferView['byteOffset'] = lByteOffset

        for lKey, lAccessor in lib_parameters.items():
            lAccessor['bufferView'] = lBufferViewName
            lib_accessors[lKey] = lAccessor

        lByteOffset += lBufferView['byteLength']
    

def Convert(path, animFrameRate = 1 / 30):
    # Prepare the FBX SDK.
    lSdkManager, lScene = InitializeSdkObjects()
    fbxConverter = FbxGeometryConverter(lSdkManager)
    # Load the scene.
    lResult = LoadScene(lSdkManager, lScene, path)

    if not lResult:
        print("\n\nAn error occurred while loading the scene...")
    else:
        lBaseName = os.path.splitext(os.path.basename(sys.argv[1]))[0]
        lRoot, lExt = os.path.splitext(sys.argv[1])

        lSceneName = ConvertScene(lScene, fbxConverter)
        ConvertAnimation(lScene, animFrameRate)

        #Merge binary data and write to a binary file
        lBin = bytearray()
        lBin.extend(attributeBuffer)
        lBin.extend(indicesBuffer)
        lBin.extend(invBindMatricesBuffer)
        lBin.extend(animationBuffer)

        out = open(lRoot + ".bin", 'wb')
        out.write(lBin)
        out.close()

        lBufferName = lBaseName + '.bin'
        lib_buffers[lBufferName] = {'byteLength' : len(lBin), 'path' : lBufferName}

        CreateBufferViews(lBufferName)

        #Output json
        lOutput = {
            'animations' : lib_animations,
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
        out.write(json.dumps(lOutput, indent = 4, sort_keys = True, separators=(',', ': ')))
        out.close()

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

    if len(sys.argv) > 1:
        Convert(sys.argv[1], float(sys.argv[2]));
    else:
        print("\n\nUsage: fbx2gltf <FBX file name>\n")
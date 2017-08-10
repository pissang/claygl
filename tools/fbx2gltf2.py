# ############################################
# fbx to glTF2.0 converter
# glTF spec : https://github.com/KhronosGroup/glTF/blob/master/specification/2.0
# fbx version 2018.1.1
# TODO: support python2.7
# http://github.com/pissang/
# ############################################
import sys, struct, json, os.path, math, argparse

try:
    from FbxCommon import *
except ImportError:
    import platform
    msg = 'You need to copy the content in compatible subfolder under /lib/python<version> into your python install folder such as '
    if platform.system() == 'Windows' or platform.system() == 'Microsoft':
        msg += '"Python26/Lib/site-packages"'
    elif platform.system() == 'Linux':
        msg += '"/usr/local/lib/python3.3/site-packages"'
    elif platform.system() == 'Darwin':
        msg += '"/Library/Frameworks/Python.framework/Versions/3.3/lib/python3.3/site-packages"'
    msg += ' folder.'
    print(msg)
    sys.exit(1)

lib_materials = []

lib_images = []
lib_samplers = []
lib_textures = []

# attributes, indices, anim_parameters will be merged in accessors
lib_attributes_accessors = []
lib_indices_accessors = []
lib_animation_accessors = []
lib_ibm_accessors = []
lib_accessors = []

lib_buffer_views = []
lib_buffers = []

lib_cameras = []
lib_meshes = []

lib_nodes = []
lib_scenes = []

lib_skins = []

lib_animations = []

# Only python 3 support bytearray ?
# http://dabeaz.blogspot.jp/2010/01/few-useful-bytearray-tricks.html
attributeBuffer = bytearray()
indicesBuffer = bytearray()
invBindMatricesBuffer = bytearray()
animationBuffer = bytearray()

GL_RGBA = 0x1908

GL_BYTE = 5120
GL_UNSIGNED_BYTE = 5121
GL_SHORT = 5122
GL_UNSIGNED_SHORT = 5123
GL_UNSIGNED_INT = 5125
GL_FLOAT = 5126

GL_REPEAT = 0x2901


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
        elif pStride == 16:
            m = item
            lData.append(struct.pack(lType, m[0][0], m[0][1], m[0][2], m[0][3], m[1][0], m[1][1], m[1][2], m[1][3], m[2][0], m[2][1], m[2][2], m[2][3], m[3][0], m[3][1], m[3][2], m[3][3]))
        if minMax:
            if pStride == 1:
                lMin = min(lMin, item)
                lMax = max(lMin, item)
            else:
                for i in lRange:
                    lMin[i] = min(lMin[i], item[i])
                    lMax[i] = max(lMax[i], item[i])

    if pType == 'f':
        lGLTFAcessor['componentType'] = GL_FLOAT
    # Unsigned Int
    elif pType == 'I':
        lGLTFAcessor['componentType'] = GL_UNSIGNED_INT

    # Unsigned Short
    elif pType == 'H':
        lGLTFAcessor['componentType'] = GL_UNSIGNED_SHORT

    if pStride == 1:
        lGLTFAcessor['type'] = 'SCALAR'
    elif pStride == 2:
        lGLTFAcessor['type'] = 'VEC2'
    elif pStride == 3:
        lGLTFAcessor['type'] = 'VEC3'
    elif pStride == 4:
        lGLTFAcessor['type'] = 'VEC4'
    elif pStride == 9:
        lGLTFAcessor['type'] = 'MAT3'
    elif pStride == 16:
        lGLTFAcessor['type'] = 'MAT4'

    lGLTFAcessor['byteOffset'] = 0
    lGLTFAcessor['count'] = len(pList)

    if minMax:
        lGLTFAcessor['max'] = lMax
        lGLTFAcessor['min'] = lMin

    return b''.join(lData), lGLTFAcessor


def CreateAttributeBuffer(pList, pType, pStride):
    lData, lGLTFAttribute = CreateAccessorBuffer(pList, pType, pStride, True)
    lGLTFAttribute['byteOffset'] = len(attributeBuffer)
    attributeBuffer.extend(lData)
    idx = len(lib_accessors)
    lib_attributes_accessors.append(lGLTFAttribute)
    lib_accessors.append(lGLTFAttribute)
    return idx


def CreateIndicesBuffer(pList, pType):
    lData, lGLTFIndices = CreateAccessorBuffer(pList, pType, 1, False)
    lGLTFIndices['byteOffset'] = len(indicesBuffer)
    indicesBuffer.extend(lData)
    idx = len(lib_accessors)
    lib_indices_accessors.append(lGLTFIndices)
    lib_accessors.append(lGLTFIndices)
    return idx

def CreateAnimationBuffer(pList, pType, pStride):
    lData, lGLTFAnimSampler = CreateAccessorBuffer(pList, pType, pStride, False)
    lGLTFAnimSampler['byteOffset'] = len(animationBuffer)
    animationBuffer.extend(lData)
    idx = len(lib_accessors)
    lib_animation_accessors.append(lGLTFAnimSampler)
    lib_accessors.append(lGLTFAnimSampler)
    return idx

def CreateIBMBuffer(pList):
    lData, lGLTFIBM = CreateAccessorBuffer(pList, 'f', 16)
    lGLTFIBM['byteOffset'] = len(invBindMatricesBuffer)
    invBindMatricesBuffer.extend(lData)
    idx = len(lib_accessors)
    lib_ibm_accessors.append(lGLTFIBM)
    lib_accessors.append(lGLTFIBM)
    return idx


def CreateImage(pPath):
    lImageIndices = [idx for idx in range(len(lib_images)) if lib_images[idx]['uri'] == pPath]
    if len(lImageIndices):
        return lImageIndices[0]

    lImageIdx = len(lib_images)
    lib_images.append({
        'uri' : pPath
    })
    return lImageIdx

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
        lSamplerIdx = len(lib_samplers)
        lib_samplers.append({
            'wrapS' : ConvertWrapMode(pTexture.WrapModeU.Get()),
            'wrapT' : ConvertWrapMode(pTexture.WrapModeV.Get()),
            # Texture filter in fbx ?
            'minFilter' : GL_LINEAR_MIPMAP_LINEAR,
            'magFilter' : GL_LINEAR
        })
        _samplerHashMap[lHashKey] = lSamplerIdx
        return lSamplerIdx

_textureHashMap = {}
def CreateTexture(pProperty):
    lTextureList = []

    lFileTextures = []
    lLayeredTextureCount = pProperty.GetSrcObjectCount(FbxCriteria.ObjectType(FbxLayeredTexture.ClassId))
    if lLayeredTextureCount > 0:
        for i in range(lLayeredTextureCount):
            lLayeredTexture = pProperty.GetSrcObject(FbxCriteria.ObjectType(FbxLayeredTexture.ClassId), i)
            for j in range(lLayeredTexture.GetSrcObjectCount(FbxCriteria.ObjectType(FbxTexture.ClassId))):
                lTexture = lLayeredTexture.GetSrcObject(FbxCriteria.ObjectType(FbxTexture.ClassId), j)
                if lTexture and lTexture.__class__ == FbxFileTexture:
                    lFileTextures.append(lTexture)
        pass
    else:
        lTextureCount = pProperty.GetSrcObjectCount(FbxCriteria.ObjectType(FbxTexture.ClassId))
        for t in range(lTextureCount):
            lTexture = pProperty.GetSrcObject(FbxCriteria.ObjectType(FbxTexture.ClassId), t)
            if lTexture and lTexture.__class__ == FbxFileTexture:
                lFileTextures.append(lTexture)

    for lTexture in lFileTextures:
        lImageIdx = CreateImage(lTexture.GetFileName())
        lSamplerIdx = CreateSampler(lTexture)
        lHashKey = (lImageIdx, lSamplerIdx)
        if lHashKey in _textureHashMap:
            lTextureList.append(_textureHashMap[lHashKey])
        else:
            lTextureIdx = len(lib_textures)
            lib_textures.append({
                'format' : GL_RGBA,
                'internalFormat' : GL_RGBA,
                'sampler' : lSamplerIdx,
                'source' : lImageIdx,
                'target' : GL_TEXTURE_2D
            })
            _textureHashMap[lHashKey] = lTextureIdx
            lTextureList.append(lTextureIdx)
    # PENDING Return the first texture ?
    if len(lTextureList) > 0:
        return lTextureList[0]
    else:
        return None

def ConvertMaterial(pMaterial):
    lMaterialName = pMaterial.GetName()

    lGLTFMaterial = {
        "name" : lMaterialName,
        # TODO PBR
        "extensions": {
            "KHR_materials_common": {
                "technique": "BLINN",
                "values": {}
            }
        }
    } 
    lValues = lGLTFMaterial['extensions']['KHR_materials_common']['values']
    lShading = pMaterial.ShadingModel.Get()

    lMaterialIdx = len(lib_materials);
    if (lShading == 'unknown'):
        lib_materials.append(lGLTFMaterial)
        return lMaterialIdx

    lValues['ambient'] = list(pMaterial.Ambient.Get())
    lValues['emission'] = list(pMaterial.Emissive.Get())

    if pMaterial.TransparencyFactor.Get() < 1:
        lValues['transparency'] = pMaterial.TransparencyFactor.Get()
        # Old fbx version transparency is 0 if object is opaque
        if (lValues['transparency'] == 0):
            lValues['transparency'] = 1
        
        lValues['transparent'] = True

    # Use diffuse map
    # TODO Diffuse Factor ?
    if pMaterial.Diffuse.GetSrcObjectCount() > 0:
        lTextureIdx = CreateTexture(pMaterial.Diffuse)
        if not lTextureIdx == None:
            lValues['diffuse'] = lTextureIdx
    else:
        lValues['diffuse'] = list(pMaterial.Diffuse.Get())

    if pMaterial.Bump.GetSrcObjectCount() > 0:
        # TODO 3dsmax use the normal map as bump map ?
        lTextureIdx = CreateTexture(pMaterial.Bump)
        if not lTextureName == None:
            lGLTFMaterial['normalTexture'] = {
                "index": lTextureIdx
            }

    if pMaterial.NormalMap.GetSrcObjectCount() > 0:
        lTextureIdx = CreateTexture(pMaterial.NormalMap)
        if not lTextureIdx == None:
            lGLTFMaterial['normalTexture'] = {
                "index": lTextureIdx
            }

    if lShading == 'phong':
        lValues['shininess'] = pMaterial.Shininess.Get();
        # Use specular map
        # TODO Specular Factor ?
        if pMaterial.Specular.GetSrcObjectCount() > 0:
            pass
        else:
            lValues['specular'] = list(pMaterial.Specular.Get())

    lib_materials.append(lGLTFMaterial)
    return lMaterialIdx

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
    lSkinIdx = len(lib_skins)
    # https://github.com/KhronosGroup/glTF/issues/100
    lib_skins.append({
        'joints' : [],
    })

    return lSkinIdx

_defaultMaterialName = 'DEFAULT_MAT_'
_defaultMaterialIndex = 0

def ConvertMesh(pScene, pMesh, pNode, pSkin, pClusters):

    global _defaultMaterialIndex;

    lGLTFPrimitive = {}
    lPositions = []
    lNormals = []
    lTexcoords = []
    lTexcoords2 = []
    lIndices = []

    lWeights = []
    lJoints = []
    # Count joint number of each vertex
    lJointCounts = []

    # Only consider layer 0
    lLayer = pMesh.GetLayer(0)
    # Uv of lightmap on layer 1
    # PENDING Uv2 always on layer 1?
    lLayer2 = pMesh.GetLayer(1)

    if lLayer:
        ## Handle material
        lLayerMaterial = lLayer.GetMaterials()
        lMaterial = None;
        if not lLayerMaterial:
            print("Mesh " + pNode.GetName() + " doesn't have material")
            lMaterial = FbxSurfacePhong.Create(pScene, _defaultMaterialName + str(_defaultMaterialIndex))
            _defaultMaterialIndex += 1;
        else:
            # Mapping Mode of material must be eAllSame
            # Because the mesh has been splitted by material
            idx = lLayerMaterial.GetIndexArray()[0];
            lMaterial = pNode.GetMaterial(idx)
        lMaterialKey = ConvertMaterial(lMaterial)
        lGLTFPrimitive["material"] = lMaterialKey

        lNormalSplitted = False
        lUvSplitted = False
        lUv2Splitted = False
        ## Handle normals
        lLayerNormal = lLayer.GetNormals()
        if lLayerNormal:
            lNormalSplitted = ConvertVertexLayer(pMesh, lLayerNormal, lNormals)

        ## Handle uvs
        lLayerUV = lLayer.GetUVs()

        lLayer2Uv = None

        if lLayerUV:
            lUvSplitted = ConvertVertexLayer(pMesh, lLayerUV, lTexcoords)

        if lLayer2:
            lLayer2Uv = lLayer2.GetUVs()
            if lLayer2Uv:
                lUv2Splitted = ConvertVertexLayer(pMesh, lLayer2Uv, lTexcoords2)

        hasSkin = False
        moreThanFourJoints = False
        lMaxJointCount = 0
        ## Handle Skinning data
        if (pMesh.GetDeformerCount(FbxDeformer.eSkin) > 0):
            hasSkin = True
            lControlPointsCount = pMesh.GetControlPointsCount()
            for i in range(lControlPointsCount):
                lWeights.append([0, 0, 0, 0])
                lJoints.append([-1, -1, -1, -1])
                lJointCounts.append(0)

            for i in range(pMesh.GetDeformerCount(FbxDeformer.eSkin)):
                lDeformer = pMesh.GetDeformer(i, FbxDeformer.eSkin)

                for i2 in range(lDeformer.GetClusterCount()):
                    lCluster = lDeformer.GetCluster(i2)
                    lNode = lCluster.GetLink()
                    lJointIndex = -1
                    lNodeIdx = GetNodeIdx(lNode)
                    if not lNodeIdx in pSkin['joints']:
                        lJointIndex = len(pSkin['joints'])
                        pSkin['joints'].append(lNodeIdx)

                        pClusters[lNodeIdx] = lCluster
                    else:
                        lJointIndex = pSkin['joints'].index(lNodeIdx)

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
                            lWeights[lControlPointIndex][lJointCount] = lControlPointWeight
                        else:
                            moreThanFourJoints = True
                            # More than four joints, replace joint of minimum Weight
                            lMinW, lMinIdx = min( (lWeights[lControlPointIndex][i], i) for i in range(len(lWeights[lControlPointIndex])) )
                            lJoints[lControlPointIndex][lMinIdx] = lJointIndex
                            lWeights[lControlPointIndex][lMinIdx] = lControlPointWeight
                            lMaxJointCount = max(lMaxJointCount, lJointIndex)
                        lJointCounts[lControlPointIndex] += 1

        if moreThanFourJoints:
            print('More than 4 joints (%d joints) bound to per vertex in %s. ' %(lMaxJointCount, pNode.GetName()))

        # Weight is FLOAT_3 because it is normalized
        for i in range(len(lWeights)):
            lWeights[i] = lWeights[i][:3]

        if lNormalSplitted or lUvSplitted or lUv2Splitted:
            lCount = 0
            lVertexCount = 0
            lNormalsTmp = []
            lTexcoordsTmp = []
            lTexcoords2Tmp = []
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

                if lLayerUV:
                    if not lUvSplitted:
                        lTexcoord = lTexcoords[idx]
                    else:
                        lTexcoord = lTexcoords[lCount]

                if lLayer2Uv:
                    if not lUv2Splitted:
                        lTexcoord = lTexcoords2[idx]
                    else:
                        lTexcoord2 = lTexcoords2[lCount]

                lCount += 1

                #Compress vertex, hashed with position and normal
                if lLayer2Uv:
                    if lLayer2Uv:
                        lKey = (lPosition[0], lPosition[1], lPosition[2], lNormal[0], lNormal[1], lNormal[2], lTexcoord[0], lTexcoord[1], lTexcoord2[0], lTexcoord2[1])
                    else:
                        lKey = (lPosition[0], lPosition[1], lPosition[2], lNormal[0], lNormal[1], lNormal[2], lTexcoord2[0], lTexcoord2[1])
                elif lLayerUV:
                    lKey = (lPosition[0], lPosition[1], lPosition[2], lNormal[0], lNormal[1], lNormal[2], lTexcoord[0], lTexcoord[1])
                else:
                    lKey = (lPosition[0], lPosition[1], lPosition[2], lNormal[0], lNormal[1], lNormal[2])

                if lKey in lVertexMap:
                    lIndices.append(lVertexMap[lKey])
                else:
                    lPositions.append(lPosition)
                    lNormalsTmp.append(lNormal)

                    if lLayerUV:
                        lTexcoordsTmp.append(lTexcoord)

                    if lLayer2Uv:
                        lTexcoords2Tmp.append(lTexcoord2)

                    if hasSkin:
                        lWeightsTmp.append(lWeights[idx])
                        lJointsTmp.append(lJoints[idx])
                    lIndices.append(lVertexCount)
                    lVertexMap[lKey] = lVertexCount
                    lVertexCount += 1

            lNormals = lNormalsTmp
            lTexcoords = lTexcoordsTmp
            lTexcoords2 = lTexcoords2Tmp

            if hasSkin:
                lWeights = lWeightsTmp
                lJoints = lJointsTmp
        else:
            lIndices = pMesh.GetPolygonVertices()
            lPositions = pMesh.GetControlPoints()

        lGLTFPrimitive['attributes'] = {}
        lGLTFPrimitive['attributes']['POSITION'] = CreateAttributeBuffer(lPositions, 'f', 3)
        if not lLayerNormal == None:
            lGLTFPrimitive['attributes']['NORMAL'] = CreateAttributeBuffer(lNormals, 'f', 3)
        if lLayerUV:
            lGLTFPrimitive['attributes']['TEXCOORD_0'] = CreateAttributeBuffer(lTexcoords, 'f', 2)
        if lLayer2Uv:
            lGLTFPrimitive['attributes']['TEXCOORD_1'] = CreateAttributeBuffer(lTexcoords2, 'f', 2)
        if hasSkin:
            # PENDING Joint indices use other data type ?
            lGLTFPrimitive['attributes']['JOINTS_0'] = CreateAttributeBuffer(lJoints, 'f', 4)
            lGLTFPrimitive['attributes']['WEIGHTS_0'] = CreateAttributeBuffer(lWeights, 'f', 3)

        if len(lPositions) >= 0xffff:
            #Use unsigned int in element indices
            lIndicesType = 'I'
        else:
            lIndicesType = 'H'
        lGLTFPrimitive['indices'] = CreateIndicesBuffer(lIndices, lIndicesType)

        return lGLTFPrimitive
    else:
        return None

def ConvertCamera(pCamera):
    lGLTFCamera = {}

    if pCamera.ProjectionType.Get() == FbxCamera.ePerspective:
        lGLTFCamera['type'] = 'perspective'
        lGLTFCamera['perspective'] = {
            "yfov": pCamera.FieldOfView.Get(),
            "znear": pCamera.NearPlane.Get(),
            "zfar": pCamera.FarPlane.Get()
        }
    elif pCamera.ProjectionType.Get() == FbxCamera.eOrthogonal:
        lGLTFCamera['type'] = 'orthographic'
        lGLTFCamera['orthographic'] = {
            # PENDING
            "xmag": pCamera.OrthoZoom.Get(),
            "ymag": pCamera.OrthoZoom.Get(),
            "znear": pCamera.NearPlane.Get(),
            "zfar": pCamera.FarPlane.Get()
        }

    lCameraIdx = len(lib_cameras)
    lib_cameras.append(lGLTFCamera)
    return lCameraIdx

def ConvertSceneNode(pScene, pNode, pPoseTime, fbxConverter):
    lGLTFNode = {}
    lNodeName = pNode.GetName()
    lGLTFNode['name'] = pNode.GetName()

    lib_nodes.append(lGLTFNode)

    # Transform matrix
    m = pNode.EvaluateLocalTransform(pPoseTime)
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
        lMeshKey = lNodeName
        lMeshName = lGeometry.GetName()
        if lMeshName == '':
            lMeshName = lMeshKey

        lGLTFMesh = {'name' : lMeshName}

        fbxConverter.Triangulate(lGeometry, True)

        lHasSkin = False
        lGLTFSkin = None
        lClusters = {}

        # If any attribute of this node have skinning data
        # (Mesh splitted by material may have multiple MeshAttribute in one node)
        for i in range(pNode.GetNodeAttributeCount()):
            lNodeAttribute = pNode.GetNodeAttributeByIndex(i)
            if lNodeAttribute.GetAttributeType() == FbxNodeAttribute.eMesh:
                if (lNodeAttribute.GetDeformerCount(FbxDeformer.eSkin) > 0):
                    lHasSkin = True
        if lHasSkin:
            lSkinIdx = CreateSkin()
            lGLTFSkin = lib_skins[lSkinIdx]
            lGLTFNode['skin'] = lSkinIdx

        for i in range(pNode.GetNodeAttributeCount()):
            lNodeAttribute = pNode.GetNodeAttributeByIndex(i)
            if lNodeAttribute.GetAttributeType() == FbxNodeAttribute.eMesh:
                lPrimitive = ConvertMesh(pScene, lNodeAttribute, pNode, lGLTFSkin, lClusters)
                if not lPrimitive == None:
                    if (not "primitives" in lGLTFMesh):
                        lGLTFMesh["primitives"] = []
                    lGLTFMesh["primitives"].append(lPrimitive)

        if "primitives" in lGLTFMesh:
            lMeshIdx = len(lib_meshes)
            lib_meshes.append(lGLTFMesh)
            lGLTFNode['mesh'] = lMeshIdx

        if lHasSkin:
            roots = []
            lExtraJoints = []
            # Find Root
            for lNodeIdx in lGLTFSkin['joints']:
                lCluster = lClusters[lNodeIdx]
                lLink = lCluster.GetLink()
                lParent = lLink
                lRootFound = False
                # Parent already have index
                lParentIdx = GetNodeIdx(lParent)
                # if lParent == None or not lParent.GetName() in lGLTFSkin['joints']:
                #     if not lParent.GetName() in roots:
                #         roots.append(lLink.GetName())
                while not lParent == None:
                    lSkeleton = lParent.GetSkeleton()
                    if lSkeleton == None:
                        break;

                    # In case some skeleton is not a attached to any vertices(not a cluster)
                    # PENDING
                    if not lParentIdx in lGLTFSkin['joints'] and not lParentIdx in lExtraJoints:
                        lExtraJoints.append(lParentIdx)

                    if lSkeleton.IsSkeletonRoot():
                        lRootFound = True
                        break;
                    lParent = lParent.GetParent()
                    lParentIdx = GetNodeIdx(lParent)

                # lSkeletonTypes = ["Root", "Limb", "Limb Node", "Effector"]
                # print(lSkeletonTypes[lSkeleton.GetSkeletonType()])

                if lRootFound:
                    if not lParentIdx in roots:
                        roots.append(lParentIdx)
                else:
                    # TODO IsSkeletonRoot not works well, try another way
                    # which do not have a parent or its parent is not in skin
                    lParent = lLink.GetParent()
                    if lParent == None or not GetNodeIdx(lParent) in lGLTFSkin['joints']:
                        if not GetNodeIdx(lLink) in roots:
                            roots.append(GetNodeIdx(lLink))

            # lRootNode = fbxNodes[roots[0]]
            # lRootNodeTransform = lRootNode.GetParent().EvaluateGlobalTransform()

            lClusterGlobalInitMatrix = FbxAMatrix()
            lReferenceGlobalInitMatrix = FbxAMatrix()

            lT = pNode.GetGeometricTranslation(FbxNode.eSourcePivot)
            lR = pNode.GetGeometricRotation(FbxNode.eSourcePivot)
            lS = pNode.GetGeometricScaling(FbxNode.eSourcePivot)

            lIBM = []
            for i in range(len(lGLTFSkin['joints'])):
                lJointIdx = lGLTFSkin['joints'][i]
                lCluster = lClusters[lJointIdx]

                # Inverse Bind Pose Matrix
                # Matrix of Mesh
                lCluster.GetTransformMatrix(lReferenceGlobalInitMatrix)
                # Matrix of Joint
                lCluster.GetTransformLinkMatrix(lClusterGlobalInitMatrix)
                # http://blog.csdn.net/bugrunner/article/details/7232291
                # http://help.autodesk.com/view/FBX/2017/ENU/?guid=__cpp_ref__view_scene_2_draw_scene_8cxx_example_html
                m = lClusterGlobalInitMatrix.Inverse() * lReferenceGlobalInitMatrix * FbxAMatrix(lT, lR, lS)
                lIBM.append(m)

            for i in range(len(lExtraJoints)):
                lIBM.append(FbxMatrix())

            lGLTFSkin['inverseBindMatrices'] = CreateIBMBuffer(lIBM)

            lGLTFSkin['joints'] += lExtraJoints

            # Mesh with skin should have identity global transform.
            # Since vertices have all been transformed to skeleton spaces.
            # PENDING
            m = FbxAMatrix()
            if not pNode.GetParent() == None:
                m = pNode.GetParent().EvaluateGlobalTransform(pPoseTime)
            m = m.Inverse()
            lGLTFNode['matrix'] = [
                m[0][0], m[0][1], m[0][2], m[0][3], m[1][0], m[1][1], m[1][2], m[1][3], m[2][0], m[2][1], m[2][2], m[2][3], m[3][0], m[3][1], m[3][2], m[3][3]
            ]

    else:
        # Camera and light node attribute
        lNodeAttribute = pNode.GetNodeAttribute()
        if not lNodeAttribute == None:
            lAttributeType = lNodeAttribute.GetAttributeType()
            if lAttributeType == FbxNodeAttribute.eCamera:
                lCameraKey = ConvertCamera(lNodeAttribute)
                lGLTFNode['camera'] = lCameraKey

    if pNode.GetChildCount() > 0:
        lGLTFNode['children'] = []
        for i in range(pNode.GetChildCount()):
            lChildNodeIdx = ConvertSceneNode(pScene, pNode.GetChild(i), pPoseTime, fbxConverter)
            lGLTFNode['children'].append(lChildNodeIdx)

    return GetNodeIdx(pNode)

def ConvertScene(pScene, pPoseTime, fbxConverter):
    lRoot = pScene.GetRootNode()

    lGLTFScene = {'nodes' : []}

    lSceneIdx = len(lib_scenes)
    lib_scenes.append(lGLTFScene)

    for i in range(lRoot.GetChildCount()):
        lNodeIdx = ConvertSceneNode(pScene, lRoot.GetChild(i), pPoseTime, fbxConverter)
        lGLTFScene['nodes'].append(lNodeIdx)

    return lSceneIdx

def CreateAnimation():
    lAnimIdx = len(lib_animations)
    lGLTFAnimation = {
        'channels' : [],
        'samplers' : []
    }

    return lAnimIdx, lGLTFAnimation

_samplerChannels = ['rotation', 'scale', 'translation']

def GetPropertyAnimationCurveTime(pAnimCurve):
    lTimeSpan = FbxTimeSpan()
    pAnimCurve.GetTimeInterval(lTimeSpan)
    lStartTimeDouble = lTimeSpan.GetStart().GetSecondDouble()
    lEndTimeDouble = lTimeSpan.GetStop().GetSecondDouble()
    lDuration = lEndTimeDouble - lStartTimeDouble

    return lStartTimeDouble, lEndTimeDouble, lDuration

def ConvertNodeAnimation(pAnimLayer, pNode, pSampleRate, pStartTime, pDuration):
    lNodeIdx = GetNodeIdx(pNode)

    # PENDING
    lTranslationCurve = pNode.LclTranslation.GetCurve(pAnimLayer, 'X')
    lRotationCurve = pNode.LclRotation.GetCurve(pAnimLayer, 'X')
    lScalingCurve = pNode.LclScaling.GetCurve(pAnimLayer, 'X')

    lHaveTranslation = not lTranslationCurve == None
    lHaveRotation = not lRotationCurve == None
    lHaveScaling = not lScalingCurve == None

    # Curve time span may much smaller than stack local time span
    # It can reduce a lot of space
    # PENDING
    lStartTimeDouble = lEndTimeDouble = lDuration = 0
    if lHaveTranslation:
        lStartTimeDouble, lEndTimeDouble, lDuration = GetPropertyAnimationCurveTime(lTranslationCurve)

    if lDuration < 1e-5 and lHaveRotation:
        lStartTimeDouble, lEndTimeDouble, lDuration = GetPropertyAnimationCurveTime(lRotationCurve)

    if lDuration < 1e-5 and lHaveScaling:
        lStartTimeDouble, lEndTimeDouble, lDuration = GetPropertyAnimationCurveTime(lScalingCurve)

    lDuration = min(lDuration, pDuration)
    lStartTimeDouble = max(lStartTimeDouble, pStartTime)

    if lDuration > 1e-5:
        lAnimName, lGLTFAnimation = CreateAnimation()

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
            lTimeChannel.append(lSecondDouble)

            if lHaveRotation:
                lRotationChannel.append(list(lQuaternion))
            if lHaveTranslation:
                lTranslationChannel.append(list(lTranslation))
            if lHaveScaling:
                lScaleChannel.append(list(lScale))

        lSamplerAccessors = {
            # TODO Share time
            "time": CreateAnimationBuffer(lTimeChannel, 'f', 1)
        };
        if lHaveTranslation:
            lSamplerAccessors['translation'] = CreateAnimationBuffer(lTranslationChannel, 'f', 3)
        if lHaveRotation:
            lSamplerAccessors['rotation'] = CreateAnimationBuffer(lRotationChannel, 'f', 4)
        if lHaveScaling:
            lSamplerAccessors['scale'] = CreateAnimationBuffer(lScaleChannel, 'f', 3)

        #TODO Other interpolation methods
        for path in _samplerChannels:
            if path in lSamplerAccessors:
                lSamplerIdx = len(lGLTFAnimation['samplers'])
                lGLTFAnimation['samplers'].append({
                    "input": lSamplerAccessors['time'],
                    "interpolation": "LINEAR",
                    "output": lSamplerAccessors[path]
                })
                lGLTFAnimation['channels'].append({
                    "sampler" : lSamplerIdx,
                    "target" : {
                        "node": lNodeIdx,
                        "path" : path
                    }
                })

        if len(lGLTFAnimation['channels']) > 0:
            lib_animations.append(lGLTFAnimation)

    for i in range(pNode.GetChildCount()):
        ConvertNodeAnimation(pAnimLayer, pNode.GetChild(i), pSampleRate, pStartTime, pDuration)

def ConvertAnimation(pScene, pSampleRate, pStartTime, pDuration):
    lRoot = pScene.GetRootNode()
    for i in range(pScene.GetSrcObjectCount(FbxCriteria.ObjectType(FbxAnimStack.ClassId))):
        lAnimStack = pScene.GetSrcObject(FbxCriteria.ObjectType(FbxAnimStack.ClassId), i)
        for j in range(lAnimStack.GetSrcObjectCount(FbxCriteria.ObjectType(FbxAnimLayer.ClassId))):
            lAnimLayer = lAnimStack.GetSrcObject(FbxCriteria.ObjectType(FbxAnimLayer.ClassId), j)
            # for k in range(lRoot.GetChildCount()):
            ConvertNodeAnimation(lAnimLayer, lRoot, pSampleRate, pStartTime, pDuration)


def CreateBufferView(pBufferIdx, appendBufferData, lib, lByteOffset, target=GL_ARRAY_BUFFER):
    lBufferViewIdx = len(lib_buffer_views)
    lBufferView = {
        "buffer": pBufferIdx,
        "byteLength": len(appendBufferData),
        "byteOffset": lByteOffset,
        "target": target
    }
    lib_buffer_views.append(lBufferView)
    for lAttrib in lib:
        lAttrib['bufferView'] = lBufferViewIdx

    return lBufferView


def CreateBufferViews(pBufferIdx):

    lByteOffset = CreateBufferView(pBufferIdx, attributeBuffer, lib_attributes_accessors, 0)['byteLength']

    if len(lib_ibm_accessors) > 0:
        lByteOffset += CreateBufferView(pBufferIdx, invBindMatricesBuffer, lib_ibm_accessors, lByteOffset)['byteLength']

    if len(lib_animation_accessors) > 0:
        lByteOffset += CreateBufferView(pBufferIdx, animationBuffer, lib_animation_accessors, lByteOffset)['byteLength']

    #Indices buffer view
    #Put the indices buffer at last or there may be a error
    #When creating a Float32Array, which the offset must be multiple of 4
    CreateBufferView(pBufferIdx, indicesBuffer, lib_indices_accessors, lByteOffset, GL_ELEMENT_ARRAY_BUFFER)


# Start from -1 and ignore the root node
_nodeCount = -1
_nodeIdxMap = {}
def ListNodes(pNode, fbxConverter):
    global _nodeCount
    _nodeIdxMap[pNode.GetUniqueID()] = _nodeCount
    _nodeCount = _nodeCount + 1
    
    # TODO SplitMeshPerMaterial may loss deformer in mesh
    # TODO It will be crashed in some fbx files
    # FBX version 2014.2 seems have fixed it
    if not pNode.GetMesh() == None:
        fbxConverter.SplitMeshPerMaterial(pNode.GetMesh(), True)

    for k in range(pNode.GetChildCount()):
        ListNodes(pNode.GetChild(k), fbxConverter)

def GetNodeIdx(pNode):
    return _nodeIdxMap[pNode.GetUniqueID()]

# FIXME
# http://help.autodesk.com/view/FBX/2017/ENU/?guid=__cpp_ref_fbxtime_8h_html
TIME_INFINITY = FbxTime(0x7fffffffffffffff)

def Convert(
    filePath,
    ouptutFile = '',
    excluded = [],
    animFrameRate = 1 / 20,
    startTime = 0,
    duration = 1000,
    poseTime = TIME_INFINITY):

    ignoreScene = 'scene' in excluded
    ignoreAnimation = 'animation' in excluded
    # Prepare the FBX SDK.
    lSdkManager, lScene = InitializeSdkObjects()
    fbxConverter = FbxGeometryConverter(lSdkManager)
    # Load the scene.
    lResult = LoadScene(lSdkManager, lScene, filePath)

    if not lResult:
        print("\n\nAn error occurred while loading the scene...")
    else:
        lBasename, lExt = os.path.splitext(ouptutFile)

        ListNodes(lScene.GetRootNode(), fbxConverter)
        if not ignoreScene:
            lSceneIdx = ConvertScene(lScene, poseTime, fbxConverter)
        if not ignoreAnimation:
            ConvertAnimation(lScene, animFrameRate, startTime, duration)

        #Merge binary data and write to a binary file
        lBin = bytearray()
        lBin.extend(attributeBuffer)
        lBin.extend(invBindMatricesBuffer)
        lBin.extend(animationBuffer)
        lBin.extend(indicesBuffer)

        out = open(lBasename + ".bin", 'wb')
        out.write(lBin)
        out.close()

        lBufferName = lBasename + '.bin'
        lib_buffers.append({'byteLength' : len(lBin), 'uri' : os.path.basename(lBufferName)})

        CreateBufferViews(0)

        #Output json
        lOutput = {
            'asset': {
                'generator': 'qtek fbx2gltf',
                'version': '2.0'
            },
            'extensionsUsed': ['KHR_materials_common'],
            'animations' : lib_animations,
            'accessors' : lib_accessors,
            'bufferViews' : lib_buffer_views,
            'buffers' : lib_buffers,
            'textures' : lib_textures,
            'samplers' : lib_samplers,
            'images' : lib_images,
            'materials' : lib_materials,
            'nodes' : lib_nodes,
            'cameras' : lib_cameras,
            'scenes' : lib_scenes,
            'meshes' : lib_meshes,
            'skins' : lib_skins,
        }
        #Default scene
        if not ignoreScene:
            lOutput['scene'] = lSceneIdx

        out = open(ouptutFile, 'w')
        out.write(json.dumps(lOutput, indent = 2, sort_keys = True, separators=(',', ': ')))
        out.close()

if __name__ == "__main__":

    parser = argparse.ArgumentParser(description='FBX to glTF converter', add_help=True)
    parser.add_argument('-e', '--exclude', type=str, default='', help="Data excluded. Can be: scene,animation")
    parser.add_argument('-t', '--timerange', default='0,1000', type=str, help="Export animation time, in format 'startSecond,endSecond'")
    parser.add_argument('-o', '--output', default='', type=str, help="Ouput glTF file path")
    parser.add_argument('-f', '--framerate', default=20, type=float, help="Animation frame per sencond")
    parser.add_argument('-p', '--pose', default=-1, type=float, help="Static pose time")
    parser.add_argument('file')

    args = parser.parse_args()

    lPoseTime = TIME_INFINITY
    lStartTime = 0
    lDuration = 1000
    lTimeRange = args.timerange.split(',')
    if lTimeRange[0]:
        lStartTime = float(lTimeRange[0])
    if lTimeRange[1]:
        lDuration = float(lTimeRange[1])

    if not args.output:
        lBasename, lExt = os.path.splitext(args.file)
        args.output = lBasename + '.gltf'

    if (args.pose >= 0):
        lPoseTime = FbxTime()
        lPoseTime.SetSecondDouble(float(args.pose))

    excluded = args.exclude.split(',')

    Convert(args.file, args.output, excluded, 1 / args.framerate, lStartTime, lDuration, lPoseTime)
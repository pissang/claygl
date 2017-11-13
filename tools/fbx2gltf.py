# ############################################
# fbx to glTF2.0 converter
# glTF spec : https://github.com/KhronosGroup/glTF/blob/master/specification/2.0
# fbx version 2018.1.1
# TODO: texture flipY?
# http://github.com/pissang/
# ############################################
import sys, struct, json, os.path, math, argparse

try:
    from FbxCommon import *
except ImportError:
    import platform
    msg = 'You need to copy the content in compatible subfolder under /lib/python<version> into your python install folder such as '
    if platform.system() == 'Windows' or platform.system() == 'Microsoft':
        msg += '"Python33/Lib/site-packages"'
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


ENV_QUANTIZE = False
ENV_FLIP_V = True

_id = 0
def GetId():
    global _id
    _id = _id + 1
    return _id

def ListFromM4(m):
    return [m[0][0], m[0][1], m[0][2], m[0][3], m[1][0], m[1][1], m[1][2], m[1][3], m[2][0], m[2][1], m[2][2], m[2][3], m[3][0], m[3][1], m[3][2], m[3][3]]

def MatGetOpacity(pMaterial):
    lFactor = pMaterial.TransparencyFactor.Get()
    lColor = pMaterial.TransparentColor.Get()

    return 1.0 - lFactor * (lColor[0] + lColor[1] + lColor[2]) / 3;


def quantize(pList, pStride, pMin, pMax):
    lRange = range(pStride)
    lMultiplier = []
    lDivider = []
    # TODO dynamic precision? may lose info?
    lPrecision = 1e6
    for i in lRange:
        pMax[i] = math.ceil(pMax[i] * lPrecision) / lPrecision;
        pMin[i] = math.floor(pMin[i] * lPrecision) / lPrecision;
        if pMax[i] == pMin[i]:
            lMultiplier.append(0)
            lDivider.append(0)
        else:
            lDividerTmp = (pMax[i] - pMin[i]) / 65535;
            lDividerTmp = math.ceil(lDividerTmp * lPrecision) / lPrecision
            lDivider.append(lDividerTmp)
            lMultiplier.append(1 / lDividerTmp)

    lNewList = []
    for item in pList:
        if pStride == 1:
            lNewList.append(int((item - pMin[0]) * lMultiplier[0]))
        else:
            lNewItem = []
            for i in lRange:
                lNewItem.append(int((item[i] - pMin[i]) * lMultiplier[i]))
            lNewList.append(lNewItem)

    # TODO
    if pStride == 1:
        lDecodeMatrix = [
            lDivider[0], 0,
            pMin[0], 1
        ]
    elif pStride == 2:
        lDecodeMatrix = [
            lDivider[0], 0, 0,
            0, lDivider[1], 0,
            pMin[0], pMin[1], 1
        ]
    elif pStride == 3:
        lDecodeMatrix = [
            lDivider[0], 0, 0, 0,
            0, lDivider[1], 0, 0,
            0, 0, lDivider[2], 0,
            pMin[0], pMin[1], pMin[2], 1
        ]
    elif pStride == 4:
        lDecodeMatrix = [
            lDivider[0], 0, 0, 0, 0,
            0, lDivider[1], 0, 0, 0,
            0, 0, lDivider[2], 0, 0,
            0, 0, 0, lDivider[3], 0,
            pMin[0], pMin[1], pMin[2], pMin[3], 1
        ]

    return lNewList, lDecodeMatrix, pMin, pMax


def CreateAccessorBuffer(pList, pType, pStride, pMinMax=False, pQuantize=False):
    lGLTFAcessor = {}

    if pMinMax:
        if len(pList) > 0:
            if pStride == 1:
                lMin = [pList[0]]
                lMax = [pList[0]]
            elif pStride == 16:
                lMin = ListFromM4(pList[0])
                lMax = ListFromM4(pList[0])
            else:
                lMin = list(pList[0])[:pStride]
                lMax = list(pList[0])[:pStride]
        else:
            lMax = [0] * pStride
            lMin = [0] * pStride
        lRange = range(pStride)
        for item in pList:
            if pStride == 1:
                for i in lRange:
                    lMin[i] = min(lMin[i], item)
                    lMax[i] = max(lMax[i], item)
            else:
                if pStride == 16:
                    item = ListFromM4(item)
                for i in lRange:
                    lMin[i] = min(lMin[i], item[i])
                    lMax[i] = max(lMax[i], item[i])

    if pQuantize and pType == 'f' and pStride <= 4:
        pList, lDecodeMatrix, lDecodedMin, lDecodedMax = quantize(pList, pStride, lMin[0:], lMax[0:])
        pType = 'H'
        # https://github.com/KhronosGroup/glTF/blob/master/extensions/Vendor/WEB3D_quantized_attributes
        lGLTFAcessor['extensions'] = {
            'WEB3D_quantized_attributes': {
                'decodedMin': lDecodedMin,
                'decodedMax': lDecodedMax,
                'decodeMatrix': lDecodeMatrix
            }
        }

    lPackType = '<' + pType * pStride
    lData = []
    #TODO: Other method to write binary buffer ?
    for item in pList:
        if pStride == 1:
            lData.append(struct.pack(lPackType, item))
        elif pStride == 2:
            lData.append(struct.pack(lPackType, item[0], item[1]))
        elif pStride == 3:
            lData.append(struct.pack(lPackType, item[0], item[1], item[2]))
        elif pStride == 4:
            lData.append(struct.pack(lPackType, item[0], item[1], item[2], item[3]))
        elif pStride == 16:
            m = item
            lData.append(struct.pack(lPackType, m[0][0], m[0][1], m[0][2], m[0][3], m[1][0], m[1][1], m[1][2], m[1][3], m[2][0], m[2][1], m[2][2], m[2][3], m[3][0], m[3][1], m[3][2], m[3][3]))

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

    if pMinMax:
        lGLTFAcessor['max'] = lMax
        lGLTFAcessor['min'] = lMin

    return b''.join(lData), lGLTFAcessor

def appendToBuffer(pType, pBuffer, pData, pObj):
    lByteOffset = len(pBuffer)
    if pType == 'f' or pType == 'I':
        # should be a multiple of 4 for alignment
        if lByteOffset % 4 == 2:
            pBuffer.extend(b'\x00\x00')
            lByteOffset += 2

    pObj['byteOffset'] = lByteOffset
    pBuffer.extend(pData)

def CreateAttributeBuffer(pList, pType, pStride):
    lData, lGLTFAttribute = CreateAccessorBuffer(pList, pType, pStride, True, ENV_QUANTIZE)
    appendToBuffer(pType, attributeBuffer, lData, lGLTFAttribute)
    idx = len(lib_accessors)
    lib_attributes_accessors.append(lGLTFAttribute)
    lib_accessors.append(lGLTFAttribute)
    return idx


def CreateIndicesBuffer(pList, pType):
    # Sketchfab needs all accessor have min, max?
    lData, lGLTFIndices = CreateAccessorBuffer(pList, pType, 1, True)
    appendToBuffer(pType, indicesBuffer, lData, lGLTFIndices)
    idx = len(lib_accessors)
    lib_indices_accessors.append(lGLTFIndices)
    lib_accessors.append(lGLTFIndices)
    return idx

def CreateAnimationBuffer(pList, pType, pStride):
    lData, lGLTFAnimSampler = CreateAccessorBuffer(pList, pType, pStride, True)

    # PENDING
    # lAllSame = True
    # for i in range(pStride):
    #     if lGLTFAnimSampler['min'][i] != lGLTFAnimSampler['max'][i]:
    #         lAllSame = False
    # # Just ignore it.
    # if lAllSame:
    #     return -1

    appendToBuffer(pType, animationBuffer, lData, lGLTFAnimSampler)

    idx = len(lib_accessors)
    lib_animation_accessors.append(lGLTFAnimSampler)
    lib_accessors.append(lGLTFAnimSampler)
    return idx

def CreateIBMBuffer(pList):
    lData, lGLTFIBM = CreateAccessorBuffer(pList, 'f', 16, True)
    appendToBuffer('f', invBindMatricesBuffer, lData, lGLTFIBM)
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
        try:
            lTextureFileName = lTexture.GetFileName()
        except UnicodeDecodeError:
            print('Get texture file name error.')
            continue
        lImageIdx = CreateImage(lTextureFileName)
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
                # Compatible with three.js loaders
                "type": "commonBlinn",
                "values": {}
            }
        }
    }
    lValues = lGLTFMaterial['extensions']['KHR_materials_common']['values']
    lShading = pMaterial.ShadingModel.Get()

    lMaterialIdx = len(lib_materials)
    if (lShading == 'unknown'):
        lib_materials.append(lGLTFMaterial)
        return lMaterialIdx

    lValues['ambient'] = list(pMaterial.Ambient.Get())
    lValues['emission'] = list(pMaterial.Emissive.Get())

    lTransparency = MatGetOpacity(pMaterial)
    if lTransparency < 1:
        lValues['transparency'] = lTransparency
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
        if not lTextureIdx == None:
            lGLTFMaterial['normalTexture'] = {
                "index": lTextureIdx
            }

    if pMaterial.NormalMap.GetSrcObjectCount() > 0:
        lTextureIdx = CreateTexture(pMaterial.NormalMap)
        if not lTextureIdx == None:
            lGLTFMaterial['normalTexture'] = {
                "index": lTextureIdx
            }
    # PENDING
    if lShading == 'phong' or lShading == 'Phong':
        lValues['shininess'] = pMaterial.Shininess.Get()
        # Use specular map
        # TODO Specular Factor ?
        if pMaterial.Specular.GetSrcObjectCount() > 0:
            pass
        else:
            lValues['specular'] = list(pMaterial.Specular.Get())

    lib_materials.append(lGLTFMaterial)
    return lMaterialIdx

def ConvertToPBRMaterial(pMaterial):
    lMaterialName = pMaterial.GetName()
    lShading = str(pMaterial.ShadingModel.Get()).lower()

    lGLTFMaterial = {
        "name" : lMaterialName,
        "pbrMetallicRoughness": {
            "baseColorFactor": [1, 1, 1, 1],
            "metallicFactor": 0,
            "roughnessFactor": 1
        }
    }
    lValues = lGLTFMaterial["pbrMetallicRoughness"];

    lMaterialIdx = len(lib_materials)

    if (lShading == 'unknown'):
        lib_materials.append(lGLTFMaterial)
        return lMaterialIdx

    lGLTFMaterial['emissiveFactor'] = list(pMaterial.Emissive.Get())

    lTransparency = MatGetOpacity(pMaterial)
    if lTransparency < 1:
        lGLTFMaterial['alphaMode'] = 'BLEND'
        lValues['baseColorFactor'][3] = lTransparency

    # Use diffuse map
    # TODO Diffuse Factor ?
    if pMaterial.Diffuse.GetSrcObjectCount() > 0:
        lTextureIdx = CreateTexture(pMaterial.Diffuse)
        if not lTextureIdx == None:
            lValues['baseColorTexture'] = {
                "index": lTextureIdx,
                "texCoord": 0
            }
    else:
        lValues['baseColorFactor'][0:3] = list(pMaterial.Diffuse.Get())

    if pMaterial.Bump.GetSrcObjectCount() > 0:
        # TODO 3dsmax use the normal map as bump map ?
        lTextureIdx = CreateTexture(pMaterial.Bump)
        if not lTextureIdx == None:
            lGLTFMaterial['normalTexture'] = {
                "index": lTextureIdx,
                "texCoord": 0
            }

    if pMaterial.NormalMap.GetSrcObjectCount() > 0:
        lTextureIdx = CreateTexture(pMaterial.NormalMap)
        if not lTextureIdx == None:
            lGLTFMaterial['normalTexture'] = {
                "index": lTextureIdx,
                "texCoord": 0
            }
    # PENDING

    if lShading == 'phong':
        lGLossiness = math.log(pMaterial.Shininess.Get()) / math.log(8192)
        lValues['roughnessFactor'] = min(max(1 - lGLossiness, 0), 1)

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

    global _defaultMaterialIndex

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
        lMaterial = None
        if not lLayerMaterial:
            print("Mesh " + pNode.GetName() + " doesn't have material")
            lMaterial = FbxSurfacePhong.Create(pScene, _defaultMaterialName + str(_defaultMaterialIndex))
            _defaultMaterialIndex += 1
        else:
            # Mapping Mode of material must be eAllSame
            # Because the mesh has been splitted by material
            idx = lLayerMaterial.GetIndexArray()[0]
            lMaterial = pNode.GetMaterial(idx)
        lMaterialKey = ConvertToPBRMaterial(lMaterial)
        lGLTFPrimitive["material"] = lMaterialKey

        lNormalSplitted = False
        lUvSplitted = False
        lUv2Splitted = False
        ## Handle normals
        lLayerNormal = lLayer.GetNormals()
        if lLayerNormal:
            lNormalSplitted = ConvertVertexLayer(pMesh, lLayerNormal, lNormals)
            if len(lNormals) == 0:
                lLayerNormal = None

        ## Handle uvs
        lLayerUV = lLayer.GetUVs()

        lLayer2Uv = None

        if lLayerUV:
            lUvSplitted = ConvertVertexLayer(pMesh, lLayerUV, lTexcoords)
            if ENV_FLIP_V:
                for i in range(len(lTexcoords)):
                    # glTF2.0 don't flipY. So flip the uv.
                    lTexcoords[i] = [lTexcoords[i][0], 1.0 - lTexcoords[i][1]]
            if len(lTexcoords) == 0:
                lLayerUV = None

        if lLayer2:
            lLayer2Uv = lLayer2.GetUVs()
            if lLayer2Uv:
                lUv2Splitted = ConvertVertexLayer(pMesh, lLayer2Uv, lTexcoords2)
                if ENV_FLIP_V:
                    for i in range(len(lTexcoords2)):
                        lTexcoords2[i] = [lTexcoords2[i][0], 1.0 - lTexcoords2[i][1]]
                if len(lTexcoords2) == 0:
                    lLayer2Uv = None

        hasSkin = False
        moreThanFourJoints = False
        lMaxJointCount = 0
        ## Handle Skinning data
        if (pMesh.GetDeformerCount(FbxDeformer.eSkin) > 0):
            hasSkin = True
            lControlPointsCount = pMesh.GetControlPointsCount()
            for i in range(lControlPointsCount):
                lWeights.append([0, 0, 0, 0])
                # -1 can't used in UNSIGNED_SHORT
                lJoints.append([0, 0, 0, 0])
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

        # Weight is VEC3 because it is normalized
        # TODO Seems most engines needs VEC4 weights.
        # for i in range(len(lWeights)):
        #     lWeights[i] = lWeights[i][:3]

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
            # PENDING UNSIGNED_SHORT will have bug.
            lGLTFPrimitive['attributes']['JOINTS_0'] = CreateAttributeBuffer(lJoints, 'H', 4)
            # TODO Seems most engines needs VEC4 weights.
            lGLTFPrimitive['attributes']['WEIGHTS_0'] = CreateAttributeBuffer(lWeights, 'f', 4)

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

def ConvertSceneNode(pScene, pNode, pPoseTime):
    lGLTFNode = {}
    lNodeName = pNode.GetName()
    lGLTFNode['name'] = pNode.GetName()

    lib_nodes.append(lGLTFNode)

    # Transform matrix
    lGLTFNode['matrix'] = ListFromM4(pNode.EvaluateLocalTransform(pPoseTime, FbxNode.eDestinationPivot))

    #PENDING : Triangulate and split all geometry not only the default one ?
    #PENDING : Multiple node use the same mesh ?
    lGeometry = pNode.GetGeometry()
    if not lGeometry == None:
        lMeshKey = lNodeName
        lMeshName = lGeometry.GetName()
        if lMeshName == '':
            lMeshName = lMeshKey

        lGLTFMesh = {'name' : lMeshName}

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
            lClusterGlobalInitMatrix = FbxAMatrix()
            lReferenceGlobalInitMatrix = FbxAMatrix()

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
                m = lClusterGlobalInitMatrix.Inverse() * lReferenceGlobalInitMatrix
                lIBM.append(m)

            lGLTFSkin['inverseBindMatrices'] = CreateIBMBuffer(lIBM)

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
            lChildNodeIdx = ConvertSceneNode(pScene, pNode.GetChild(i), pPoseTime)
            lGLTFNode['children'].append(lChildNodeIdx)

    return GetNodeIdx(pNode)

def ConvertScene(pScene, pPoseTime):
    lRoot = pScene.GetRootNode()

    lGLTFScene = {'nodes' : []}

    lSceneIdx = len(lib_scenes)
    lib_scenes.append(lGLTFScene)

    for i in range(lRoot.GetChildCount()):
        lNodeIdx = ConvertSceneNode(pScene, lRoot.GetChild(i), pPoseTime)
        lGLTFScene['nodes'].append(lNodeIdx)

    return lSceneIdx

def CreateAnimation(pName):
    lAnimIdx = len(lib_animations)
    lGLTFAnimation = {
        'name': pName,
        'channels' : [],
        'samplers' : []
    }

    return lAnimIdx, lGLTFAnimation

_samplerChannels = ['rotation', 'scale', 'translation']
_timeSamplerHashMap = {}

def GetPropertyAnimationCurveTime(pAnimCurve):
    lTimeSpan = FbxTimeSpan()
    pAnimCurve.GetTimeInterval(lTimeSpan)
    lStartTimeDouble = lTimeSpan.GetStart().GetSecondDouble()
    lEndTimeDouble = lTimeSpan.GetStop().GetSecondDouble()
    lDuration = lEndTimeDouble - lStartTimeDouble

    return lStartTimeDouble, lEndTimeDouble, lDuration

EPSILON = 1e-6
def V3Same(a, b):
    return abs(a[0] - b[0]) < EPSILON and abs(a[1] - b[1]) < EPSILON and abs(a[2] - b[2]) < EPSILON
def V4Same(a, b):
    return abs(a[0] - b[0]) < EPSILON and abs(a[1] - b[1]) < EPSILON and abs(a[2] - b[2]) < EPSILON and abs(a[3] - b[3]) < EPSILON
def V3Middle(a, b):
    return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]
def QuatSlerp(a, b, t):
    [ax, ay, az, aw] = a
    [bx, by, bz, bw] = b
    ## calc cosine
    cosom = ax * bx + ay * by + az * bz + aw * bw
    ## adjust signs (if necessary)
    if cosom < 0.0:
        cosom = -cosom
        bx = -bx
        by = -by
        bz = -bz
        bw = -bw

    ## calculate coefficients
    if 1.0 - cosom > 0.000001:
        ## standard case (slerp)
        omega = math.acos(cosom)
        sinom = math.sin(omega)
        scale0 = math.sin((1.0 - t) * omega) / sinom
        scale1 = math.sin(t * omega) / sinom
    else:
        ## "from" and "to" quaternions are very close
        ##  ... so we can do a linear interpolation
        scale0 = 1.0 - t
        scale1 = t
    ## calculate final values
    return [scale0 * ax + scale1 * bx, scale0 * ay + scale1 * by, scale0 * az + scale1 * bz, scale0 * aw + scale1 * bw]

def FitLinearInterpolation(pTime, pTranslationChannel, pRotationChannel, pScaleChannel):
    lTranslationChannel = []
    lRotationChannel = []
    lScaleChannel = []
    lTime = []
    lHaveRotation = len(pRotationChannel) > 0
    lHaveScale = len(pScaleChannel) > 0
    lHaveTranslation = len(pTranslationChannel) > 0
    if lHaveRotation:
        lRotationChannel.append(pRotationChannel[0])
    if lHaveScale:
        lScaleChannel.append(pScaleChannel[0])
    if lHaveTranslation:
        lTranslationChannel.append(pTranslationChannel[0])
    lTime.append(pTime[0])
    for i in range(len(pTime)):
        lLinearInterpolated = True
        if i > 1:
            if lHaveTranslation:
                if not V3Same(V3Middle(pTranslationChannel[i - 2], pTranslationChannel[i]), pTranslationChannel[i - 1]):
                    lLinearInterpolated = False
            if lHaveScale and lLinearInterpolated:
                if not V3Same(V3Middle(pScaleChannel[i - 2], pScaleChannel[i]), pScaleChannel[i - 1]):
                    lLinearInterpolated = False
            if lHaveRotation:
                if not V4Same(QuatSlerp(pRotationChannel[i - 2], pRotationChannel[i], 0.5), pRotationChannel[i - 1]):
                    lLinearInterpolated = False

        if not lLinearInterpolated:
            if lHaveTranslation:
                lTranslationChannel.append(pTranslationChannel[i - 1])
            if lHaveRotation:
                lRotationChannel.append(pRotationChannel[i - 1])
            if lHaveScale:
                lScaleChannel.append(pScaleChannel[i - 1])
            lTime.append(pTime[i - 1])

    if len(pTime) > 1:
        if lHaveRotation:
            lRotationChannel.append(pRotationChannel[len(pRotationChannel) - 1])
        if lHaveScale:
            lScaleChannel.append(pScaleChannel[len(pScaleChannel) - 1])
        if lHaveTranslation:
            lTranslationChannel.append(pTranslationChannel[len(pTranslationChannel) - 1])

        lTime.append(pTime[len(pTime) - 1])

    return lTime, lTranslationChannel, lRotationChannel, lScaleChannel


def ConvertNodeAnimation(pGLTFAnimation, pAnimLayer, pNode, pSampleRate, pStartTime, pDuration):
    lNodeIdx = GetNodeIdx(pNode)

    curves = [
        pNode.LclTranslation.GetCurve(pAnimLayer, 'X'),
        pNode.LclTranslation.GetCurve(pAnimLayer, 'Y'),
        pNode.LclTranslation.GetCurve(pAnimLayer, 'Z'),

        pNode.LclRotation.GetCurve(pAnimLayer, 'X'),
        pNode.LclRotation.GetCurve(pAnimLayer, 'Y'),
        pNode.LclRotation.GetCurve(pAnimLayer, 'Z'),

        pNode.LclScaling.GetCurve(pAnimLayer, 'X'),
        pNode.LclScaling.GetCurve(pAnimLayer, 'Y'),
        pNode.LclScaling.GetCurve(pAnimLayer, 'Z'),
    ]

    lHaveTranslation = any(curves[0:3])
    lHaveRotation = any(curves[3:6])
    lHaveScaling = any(curves[6:9])

    # Curve time span may much smaller than stack local time span
    # It can reduce a lot of space
    # PENDING
    lStartTimeDouble = 1000000
    lDuration = 0
    lEndTimeDouble = 0
    for curve in curves:
        if not curve == None:
            lCurveStart, lCurveEnd, lCurveDuration = GetPropertyAnimationCurveTime(curve)
            lStartTimeDouble = min(lCurveStart, lStartTimeDouble)
            lEndTimeDouble = max(lCurveEnd, lEndTimeDouble)
            lDuration = max(lCurveDuration, lDuration)

    lDuration = min(lDuration, pDuration)
    lStartTimeDouble = max(lStartTimeDouble, pStartTime)

    if lDuration > 0:
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

            lTransform = pNode.EvaluateLocalTransform(lTime, FbxNode.eDestinationPivot)
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

        lTimeChannel, lTranslationChannel, lRotationChannel, lScaleChannel = FitLinearInterpolation(
            lTimeChannel, lTranslationChannel, lRotationChannel, lScaleChannel
        )

        # TODO Performance?
        lTimeAccessorKey = tuple(lTimeChannel)
        if not lTimeAccessorKey in _timeSamplerHashMap:
            # TODO use ubyte.
            _timeSamplerHashMap[lTimeAccessorKey] = CreateAnimationBuffer(lTimeChannel, 'f', 1)

        lSamplerAccessors = {
            "time": _timeSamplerHashMap[lTimeAccessorKey]
            # "time": CreateAnimationBuffer(lTimeChannel, 'f', 1)
        }
        if lHaveTranslation:
            lAccessorIdx = CreateAnimationBuffer(lTranslationChannel, 'f', 3)
            if lAccessorIdx >= 0:
                lSamplerAccessors['translation'] = lAccessorIdx
        if lHaveRotation:
            lAccessorIdx = CreateAnimationBuffer(lRotationChannel, 'f', 4)
            if lAccessorIdx >= 0:
                lSamplerAccessors['rotation'] = lAccessorIdx
        if lHaveScaling:
            lAccessorIdx = CreateAnimationBuffer(lScaleChannel, 'f', 3)
            if lAccessorIdx >= 0:
                lSamplerAccessors['scale'] = lAccessorIdx

        #TODO Other interpolation methods
        for path in _samplerChannels:
            if path in lSamplerAccessors:
                lSamplerIdx = len(pGLTFAnimation['samplers'])
                pGLTFAnimation['samplers'].append({
                    "input": lSamplerAccessors['time'],
                    "interpolation": "LINEAR",
                    "output": lSamplerAccessors[path]
                })
                pGLTFAnimation['channels'].append({
                    "sampler" : lSamplerIdx,
                    "target" : {
                        "node": lNodeIdx,
                        "path" : path
                    }
                })

    for i in range(pNode.GetChildCount()):
        ConvertNodeAnimation(pGLTFAnimation, pAnimLayer, pNode.GetChild(i), pSampleRate, pStartTime, pDuration)

def ConvertAnimation(pScene, pSampleRate, pStartTime, pDuration):
    lRoot = pScene.GetRootNode()
    for i in range(pScene.GetSrcObjectCount(FbxCriteria.ObjectType(FbxAnimStack.ClassId))):
        lAnimStack = pScene.GetSrcObject(FbxCriteria.ObjectType(FbxAnimStack.ClassId), i)
        lAnimIdx, lGLTFAnimation = CreateAnimation(lAnimStack.GetName())
        for j in range(lAnimStack.GetSrcObjectCount(FbxCriteria.ObjectType(FbxAnimLayer.ClassId))):
            lAnimLayer = lAnimStack.GetSrcObject(FbxCriteria.ObjectType(FbxAnimLayer.ClassId), j)
            # for k in range(lRoot.GetChildCount()):
            ConvertNodeAnimation(lGLTFAnimation, lAnimLayer, lRoot, pSampleRate, pStartTime, pDuration)
        if len(lGLTFAnimation['samplers']) > 0:
            lib_animations.append(lGLTFAnimation)
# def ConvertAnimation2(pScene, pStartTime, pDuration):
#     for i in range(pScene.GetSrcObjectCount(FbxCriteria.ObjectType(FbxAnimStack.ClassId))):
#         lAnimStack = pScene.GetSrcObject(FbxCriteria.ObjectType(FbxAnimStack.ClassId), i)
#         lAnimName = lAnimStack.GetName()

#         lTakeInfo = pScene.GetTakeInfo(lAnimName)


def CreateBufferView(pBufferIdx, pBuffer, appendBufferData, lib, pByteOffset, target=GL_ARRAY_BUFFER):
    if pByteOffset % 4 == 2:
        pBuffer.extend(b'\x00\x00')
        pByteOffset += 2

    pBuffer.extend(appendBufferData)
    lBufferViewIdx = len(lib_buffer_views)
    lBufferView = {
        "buffer": pBufferIdx,
        "byteLength": len(appendBufferData),
        "byteOffset": pByteOffset,
        # PENDING
        # "byteStride": 0,
        "target": target
    }
    lib_buffer_views.append(lBufferView)
    for lAttrib in lib:
        lAttrib['bufferView'] = lBufferViewIdx

    return lBufferView


def CreateBufferViews(pBufferIdx, pBin):

    lByteOffset = CreateBufferView(pBufferIdx, pBin, attributeBuffer, lib_attributes_accessors, 0)['byteLength']

    if len(lib_ibm_accessors) > 0:
        lByteOffset += CreateBufferView(pBufferIdx, pBin, invBindMatricesBuffer, lib_ibm_accessors, lByteOffset)['byteLength']

    if len(lib_animation_accessors) > 0:
        lByteOffset += CreateBufferView(pBufferIdx, pBin, animationBuffer, lib_animation_accessors, lByteOffset)['byteLength']

    #When creating a Float32Array, which the offset must be multiple of 4
    CreateBufferView(pBufferIdx, pBin, indicesBuffer, lib_indices_accessors, lByteOffset, GL_ELEMENT_ARRAY_BUFFER)


# Start from -1 and ignore the root node
_nodeCount = -1
_nodeIdxMap = {}
def PrepareSceneNode(pNode, fbxConverter):
    global _nodeCount
    _nodeIdxMap[pNode.GetUniqueID()] = _nodeCount
    _nodeCount = _nodeCount + 1

    for k in range(pNode.GetChildCount()):
        PrepareSceneNode(pNode.GetChild(k), fbxConverter)

# Each node can have two pivot context. The node's animation data can be converted from one pivot context to the other
# Convert source pivot to destination with all zero pivot.
# http://docs.autodesk.com/FBX/2013/ENU/FBX-SDK-Documentation/index.html?url=cpp_ref/class_fbx_node.html,topicNumber=cpp_ref_class_fbx_node_html
def PrepareBakeTransform(pNode):
    # http://help.autodesk.com/view/FBX/2017/ENU/?guid=__files_GUID_C35D98CB_5148_4B46_82D1_51077D8970EE_htm
    pNode.SetPivotState(FbxNode.eSourcePivot, FbxNode.ePivotActive)
    pNode.SetPivotState(FbxNode.eDestinationPivot, FbxNode.ePivotActive)

    lZero = FbxVector4(0, 0, 0)
    pNode.SetPostRotation(FbxNode.eDestinationPivot, lZero);
    pNode.SetPreRotation(FbxNode.eDestinationPivot, lZero);
    pNode.SetRotationOffset(FbxNode.eDestinationPivot, lZero);
    pNode.SetScalingOffset(FbxNode.eDestinationPivot, lZero);
    pNode.SetRotationPivot(FbxNode.eDestinationPivot, lZero);
    pNode.SetScalingPivot(FbxNode.eDestinationPivot, lZero);

    pNode.SetGeometricTranslation(FbxNode.eDestinationPivot, lZero);
    pNode.SetGeometricRotation(FbxNode.eDestinationPivot, lZero);
    pNode.SetGeometricScaling(FbxNode.eDestinationPivot, FbxVector4(1, 1, 1));
    # pNode.SetUseQuaternionForInterpolation(FbxNode.eDestinationPivot, pNode.GetUseQuaternionForInterpolation(FbxNode.eSourcePivot));

    for k in range(pNode.GetChildCount()):
        PrepareBakeTransform(pNode.GetChild(k))


def GetNodeIdx(pNode):
    lId = pNode.GetUniqueID()
    if not lId in _nodeIdxMap:
        return -1
    return _nodeIdxMap[lId]

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
    poseTime = TIME_INFINITY,
    beautify = False
):
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

        # Do it before SplitMeshesPerMaterial or the vertices of split mesh will be wrong.
        PrepareBakeTransform(lScene.GetRootNode())
        lScene.GetRootNode().ConvertPivotAnimationRecursive(None, FbxNode.eDestinationPivot, 60)

        # PENDING Triangulate before SplitMeshesPerMaterial or it will not work.
        fbxConverter.Triangulate(lScene, True)

        # TODO SplitMeshPerMaterial may loss deformer in mesh
        # TODO It will be crashed in some fbx files
        # FBX version 2014.2 seems have fixed it
        fbxConverter.SplitMeshesPerMaterial(lScene, True)

        PrepareSceneNode(lScene.GetRootNode(), fbxConverter)

        if not ignoreScene:
            lSceneIdx = ConvertScene(lScene, poseTime)
        if not ignoreAnimation:
            ConvertAnimation(lScene, animFrameRate, startTime, duration)

        #Merge binary data and write to a binary file
        lBin = bytearray()

        CreateBufferViews(0, lBin)

        lBufferName = lBasename + '.bin'
        lib_buffers.append({'byteLength' : len(lBin), 'uri' : os.path.basename(lBufferName)})

        out = open(lBasename + ".bin", 'wb')
        out.write(lBin)
        out.close()

        #Output json
        lOutput = {
            'asset': {
                'generator': 'qtek fbx2gltf',
                'version': '2.0'
            },
            'accessors' : lib_accessors,
            'bufferViews' : lib_buffer_views,
            'buffers' : lib_buffers,
            'nodes' : lib_nodes,
            'scenes' : lib_scenes,
            'meshes' : lib_meshes,
        }
        if len(lib_cameras) > 0:
            lOutput['cameras'] = lib_cameras
        if len(lib_skins) > 0:
            lOutput['skins'] = lib_skins
        if len(lib_materials) > 0:
            lOutput['materials'] = lib_materials
        if len(lib_images) > 0:
            lOutput['images'] = lib_images
        if len(lib_samplers) > 0:
            lOutput['samplers'] = lib_samplers
        if len(lib_textures) > 0:
            lOutput['textures'] = lib_textures
        if len(lib_animations) > 0:
            lOutput['animations'] = lib_animations
        #Default scene
        if not ignoreScene:
            lOutput['scene'] = lSceneIdx

        out = open(ouptutFile, 'w')
        indent = None
        seperator = ':'

        if beautify:
            indent = 2
            seperator = ': '
        out.write(json.dumps(lOutput, indent = indent, sort_keys = True, separators=(',', seperator)))
        out.close()

if __name__ == "__main__":

    parser = argparse.ArgumentParser(description='FBX to glTF converter', add_help=True)
    parser.add_argument('-e', '--exclude', type=str, default='', help="Data excluded. Can be: scene,animation")
    parser.add_argument('-t', '--timerange', default='0,1000', type=str, help="Export animation time, in format 'startSecond,endSecond'")
    parser.add_argument('-o', '--output', default='', type=str, help="Ouput glTF file path")
    parser.add_argument('-f', '--framerate', default=20, type=float, help="Animation frame per second")
    parser.add_argument('-p', '--pose', default=0, type=float, help="Start pose time")
    parser.add_argument('-q', '--quantize', action='store_true', help="Quantize accessors with WEB3D_quantized_attributes extension")
    parser.add_argument('-b', '--beautify', action="store_true", help="Beautify json output.")

    parser.add_argument('--noflipv', action="store_true", help="If not flip v in texcoord.")
    parser.add_argument('file')

    args = parser.parse_args()

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

    # PENDING Not use INFINITY poseTime or some joint transform without animation maybe not right.
    lPoseTime = FbxTime()
    lPoseTime.SetSecondDouble(float(args.pose))

    excluded = args.exclude.split(',')

    ENV_QUANTIZE = args.quantize
    ENV_FLIP_V = not args.noflipv

    Convert(
        args.file,
        args.output,
        excluded,
        1 / args.framerate,
        lStartTime,
        lDuration,
        lPoseTime,
        args.beautify
    )
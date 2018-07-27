#!/usr/bin/env python
# ############################################
# fbx to glTF2.0 converter
# glTF spec : https://github.com/KhronosGroup/glTF/blob/master/specification/2.0
# fbx version 2018.1.1
# http://github.com/pissang/
# ############################################
import sys, struct, json, os.path, math, argparse, shutil

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

    return 1.0 - lFactor * (lColor[0] + lColor[1] + lColor[2]) / 3.0;


def quantize(pList, pStride, pMin, pMax):
    lRange = range(pStride)
    lMultiplier = []
    lDivider = []
    # TODO dynamic precision? may lose info?
    lPrecision = float(1e6)
    for i in lRange:
        pMax[i] = math.ceil(pMax[i] * lPrecision) / lPrecision;
        pMin[i] = math.floor(pMin[i] * lPrecision) / lPrecision;
        if pMax[i] == pMin[i]:
            lMultiplier.append(0.0)
            lDivider.append(0.0)
        else:
            lDividerTmp = (pMax[i] - pMin[i]) / 65535.0;
            lDividerTmp = math.ceil(lDividerTmp * lPrecision) / lPrecision
            lDivider.append(lDividerTmp)
            lMultiplier.append(1.0 / lDividerTmp)

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


def CreateAccessorBuffer(pList, pType, pStride, pMinMax=False, pQuantize=False, pNormalize=False):
    lGLTFAccessor = {}

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
        lGLTFAccessor['extensions'] = {
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
        lGLTFAccessor['componentType'] = GL_FLOAT
    # Unsigned Int
    elif pType == 'I':
        lGLTFAccessor['componentType'] = GL_UNSIGNED_INT
    # Unsigned Short
    elif pType == 'H':
        lGLTFAccessor['componentType'] = GL_UNSIGNED_SHORT
    # Unsigned Byte
    elif pType == 'B':
        lGLTFAccessor['componentType'] = GL_UNSIGNED_BYTE

    if pStride == 1:
        lGLTFAccessor['type'] = 'SCALAR'
    elif pStride == 2:
        lGLTFAccessor['type'] = 'VEC2'
    elif pStride == 3:
        lGLTFAccessor['type'] = 'VEC3'
    elif pStride == 4:
        lGLTFAccessor['type'] = 'VEC4'
    elif pStride == 9:
        lGLTFAccessor['type'] = 'MAT3'
    elif pStride == 16:
        lGLTFAccessor['type'] = 'MAT4'

    lGLTFAccessor['byteOffset'] = 0
    lGLTFAccessor['count'] = len(pList)

    if pMinMax:
        lGLTFAccessor['max'] = lMax
        lGLTFAccessor['min'] = lMin

    if pNormalize:
        lGLTFAccessor['normalized'] = True

    return b''.join(lData), lGLTFAccessor

def appendToBuffer(pType, pBuffer, pData, pObj):
    lByteOffset = len(pBuffer)
    if pType == 'f' or pType == 'I':
        # should be a multiple of 4 for alignment
        if lByteOffset % 4 == 2:
            pBuffer.extend(b'\x00\x00')
            lByteOffset += 2

    pObj['byteOffset'] = lByteOffset
    pBuffer.extend(pData)

def CreateAttributeBuffer(pList, pType, pStride, pNormalize=False):
    lData, lGLTFAttribute = CreateAccessorBuffer(pList, pType, pStride, True, ENV_QUANTIZE, pNormalize)
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

    lScaleU = 1
    lScaleV = 1
    lTranslationU = 0
    lTranslationV = 0

    if lLayeredTextureCount > 0:
        for i in range(lLayeredTextureCount):
            lLayeredTexture = pProperty.GetSrcObject(FbxCriteria.ObjectType(FbxLayeredTexture.ClassId), i)
            for j in range(lLayeredTexture.GetSrcObjectCount(FbxCriteria.ObjectType(FbxTexture.ClassId))):
                lTexture = lLayeredTexture.GetSrcObject(FbxCriteria.ObjectType(FbxTexture.ClassId), j)
                if lTexture and lTexture.__class__ == FbxFileTexture:
                    lFileTextures.append(lTexture)
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
        # TODO rotation
        lScaleU = lTexture.GetScaleU()
        lScaleV = lTexture.GetScaleV()
        lTranslationU = lTexture.GetTranslationU()
        lTranslationV = lTexture.GetTranslationV()

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
        return lTextureList[0], lScaleU, lScaleV, lTranslationU, lTranslationV
    else:
        return None, lScaleU, lScaleV, lTranslationU, lTranslationV

def GetRoughnessFromExponentShininess(pShininess):
    # PENDING Is max 1024?
    lGlossiness = math.log(pShininess) / math.log(1024.0)
    return min(max(1 - lGlossiness, 0), 1)

def GetMetalnessFromSpecular(pSpecular, pBaseColor):
    # x = pSpecular[0]
    # y = pBaseColor[0]
    # a = 0.04
    # b = x + y - 0.08
    # c = 0.04 - x
    # k = b * b - 4 * a * c
    # if k >= 0:
    #     return math.sqrt(k)
    # return 0

    # PENDING
    if pSpecular[0] > 0.5:
        return 1
    else:
        return 0

def ScaleV3(v3, scale):
    v3[0] *= scale
    v3[1] *= scale
    v3[2] *= scale

def ConvertToPBRMaterial(pMaterial):
    lMaterialName = pMaterial.GetName()
    lShading = str(pMaterial.ShadingModel.Get()).lower()

    lScaleU = 1
    lScaleV = 1
    lTranslationU = 0
    lTranslationV = 0

    lGLTFMaterial = {
        "name" : lMaterialName,
        "pbrMetallicRoughness": {
            "baseColorFactor": [1, 1, 1, 1],
            "metallicFactor": 0,
            "roughnessFactor": 1
        }
    }
    lValues = lGLTFMaterial["pbrMetallicRoughness"]

    lMaterialIdx = len(lib_materials)

    lSpecularColor = [0, 0, 0]
    # print(dir(pMaterial))

    if hasattr(pMaterial, 'Emissive'):
        lGLTFMaterial['emissiveFactor'] = list(pMaterial.Emissive.Get())
        ScaleV3(lGLTFMaterial['emissiveFactor'], pMaterial.EmissiveFactor.Get())

    if hasattr(pMaterial, 'TransparencyFactor'):
        lTransparency = MatGetOpacity(pMaterial)
        if lTransparency < 1:
            lGLTFMaterial['alphaMode'] = 'BLEND'
            lValues['baseColorFactor'][3] = lTransparency

    if hasattr(pMaterial, 'Diffuse'):
        if pMaterial.Diffuse.GetSrcObjectCount() > 0:
            # TODO other textures ?
            lTextureIdx, lScaleU, lScaleV, lTranslationU, lTranslationV = CreateTexture(pMaterial.Diffuse)
            if not lTextureIdx == None:
                lValues['baseColorTexture'] = {
                    "index": lTextureIdx,
                    "texCoord": 0
                }
        else:
            lValues['baseColorFactor'][0:3] = list(pMaterial.Diffuse.Get())

    if hasattr(pMaterial, 'Specular'):
        lSpecularColor = list(pMaterial.Specular.Get())
        ScaleV3(lSpecularColor, pMaterial.SpecularFactor.Get())

    if hasattr(pMaterial, 'Bump'):
        if pMaterial.Bump.GetSrcObjectCount() > 0:
            lTextureIdx, lScaleU, lScaleV, lTranslationU, lTranslationV = CreateTexture(pMaterial.Bump)
            if not lTextureIdx == None:
                lGLTFMaterial['normalTexture'] = {
                    "index": lTextureIdx,
                    "texCoord": 0
                }

    if hasattr(pMaterial, 'NormalMap'):
        if pMaterial.NormalMap.GetSrcObjectCount() > 0:
            lTextureIdx, lScaleU, lScaleV, lTranslationU, lTranslationV = CreateTexture(pMaterial.NormalMap)
            if not lTextureIdx == None:
                lGLTFMaterial['normalTexture'] = {
                    "index": lTextureIdx,
                    "texCoord": 0
                }

    if hasattr(pMaterial, 'NormalMShininessap'):
        lValues['roughnessFactor'] = GetRoughnessFromExponentShininess(pMaterial.Shininess.Get())

    lib_materials.append(lGLTFMaterial)

    if lShading == 'unknown':
        # Maybe shading of VRay
        lProp = pMaterial.GetFirstProperty()
        lCount = 0
        while lProp:
            lPropName = lProp.GetName()
            if lPropName == '' or lCount >= 100:
                break
            # TODO texture
            if lPropName == 'EmissiveColor':
                # Need to cast to double3
                # https://forums.autodesk.com/t5/fbx-forum/fbxproperty-get-in-2013-1-python/td-p/4243290
                lGLTFMaterial['emissiveFactor'] = list(FbxPropertyDouble3(lProp).Get())
            elif lPropName == 'DiffuseColor':
                lValues['baseColorFactor'][0:3] = list(FbxPropertyDouble3(lProp).Get())
            elif lPropName == 'SpecularColor':
                lSpecularColor = list(FbxPropertyDouble3(lProp).Get())
            elif lPropName == 'SpecularFactor':
                ScaleV3(lSpecularColor, FbxPropertyDouble1(lProp).Get())
            elif lPropName == 'ShininessExponent':
                lValues['roughnessFactor'] = GetRoughnessFromExponentShininess(FbxPropertyDouble1(lProp).Get())

            lProp = pMaterial.GetNextProperty(lProp)
            lCount += 1

    lValues['metallicFactor'] = GetMetalnessFromSpecular(lSpecularColor, lValues['baseColorFactor'][0:3])

    return lMaterialIdx, lScaleU, lScaleV, lTranslationU, lTranslationV


def CreateSkin():
    lSkinIdx = len(lib_skins)
    # https://github.com/KhronosGroup/glTF/issues/100
    lib_skins.append({
        'joints' : [],
    })

    return lSkinIdx

_defaultMaterialName = 'DEFAULT_MAT_'

def CreateDefaultMaterial(pScene):
    lMat = FbxSurfacePhong.Create(pScene, _defaultMaterialName + str(len(lib_materials)))
    return lMat

def ProcessUV(uv, scaleU, scaleV, translationU, translationV):
    for i in range(len(uv)):
        uv[i] = [
            uv[i][0] * scaleU + translationU,
            uv[i][1] * scaleV + translationV
        ]
        if ENV_FLIP_V:
            # glTF2.0 don't flipY. So flip the uv.
            uv[i][1] = 1.0 - uv[i][1]

def GetSkinningData(pMesh, pSkin, pClusters, pNode):
    moreThanFourJoints = False
    lMaxJointCount = 0
    lControlPointsCount = pMesh.GetControlPointsCount()

    lWeights = []
    lJoints = []
    # Count joint number of each vertex
    lJointCounts = []
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
                    lMinW, lMinIdx = min((lWeights[lControlPointIndex][i], i) for i in range(len(lWeights[lControlPointIndex])))
                    lJoints[lControlPointIndex][lMinIdx] = lJointIndex
                    lWeights[lControlPointIndex][lMinIdx] = lControlPointWeight
                    lMaxJointCount = max(lMaxJointCount, lJointIndex)
                lJointCounts[lControlPointIndex] += 1
    if moreThanFourJoints:
        print('More than 4 joints (%d joints) bound to per vertex in %s. ' %(lMaxJointCount, pNode.GetName()))

    return lJoints, lWeights

def CreatePrimitiveRaw(matIndex, useTexcoords1=False, scaleU=1, scaleV=1,translationU=0, translationV=1):
    return {
        "normals": [],
        "texcoords0": [],
        "texcoords1": [],
        "indices": [],
        "positions": [],
        "vertexColors": [],
        "joints": [],
        "weights": [],
        "material": matIndex,
        # Should use texcoord in layer2 if material is in layer2
        # PENDING
        "useTexcoords1": useTexcoords1,
        "indicesMap": {},
        "scaleU": scaleU,
        "scaleV": scaleV,
        "translationU": translationU,
        "translationV": translationV
    }

def GetVertexAttribute(pLayer, pControlPointIdx, pPolygonVertexIndex):
    if pLayer.GetMappingMode() == FbxLayerElement.eByControlPoint:
        if pLayer.GetReferenceMode() == FbxLayerElement.eDirect:
            return pLayer.GetDirectArray().GetAt(pControlPointIdx)
        elif pLayer.GetReferenceMode() == FbxLayerElement.eIndexToDirect:
            return pLayer.GetDirectArray().GetAt(pLayer.GetIndexArray().GetAt(pControlPointIdx))
    elif pLayer.GetMappingMode() == FbxLayerElement.eByPolygonVertex:
        if pLayer.GetReferenceMode() == FbxLayerElement.eDirect:
            return pLayer.GetDirectArray().GetAt(pPolygonVertexIndex)
        elif pLayer.GetReferenceMode() == FbxLayerElement.eDirect or\
            pLayer.GetReferenceMode() == FbxLayerElement.eIndexToDirect:
            return pLayer.GetDirectArray().GetAt(pLayer.GetIndexArray().GetAt(pPolygonVertexIndex))
    else:
        pass
        # Unknown

def ConvertMesh(pScene, pMesh, pNode, pSkin, pClusters):
    lPrimitivesList = []
    lWeights = []
    lJoints = []

    lLayer = pMesh.GetLayer(0)
    lLayer2 = pMesh.GetLayer(1)
    lSecondMaterialLayer = None
    if lLayer2:
        lSecondMaterialLayer = lLayer2.GetMaterials()

    lNormalLayer = pMesh.GetElementNormal(0)
    lVertexColorLayer = pMesh.GetElementVertexColor(0)
    lUvLayer = pMesh.GetElementUV(0)
    lUv2Layer = pMesh.GetElementUV(1)

    hasSkin = False
    # Handle Skinning data
    if (pMesh.GetDeformerCount(FbxDeformer.eSkin) > 0):
        hasSkin = True
        lJoints, lWeights = GetSkinningData(pMesh, pSkin, pClusters, pNode)
    lPositions = pMesh.GetControlPoints()
    # Prepare materials
    lAllSameMaterial = True
    lAllSameMaterialIndex = -1
    for i in range(pMesh.GetElementMaterialCount()):
        lMaterialLayer = pMesh.GetElementMaterial(i)
        if not lMaterialLayer.GetMappingMode() == FbxLayerElement.eAllSame:
            lIndexArray = lMaterialLayer.GetIndexArray()
            for k in range(pMesh.GetPolygonCount()):
                if not lIndexArray.GetAt(k) == lIndexArray.GetAt(0):
                    lAllSameMaterial = False
                    break

        if lAllSameMaterial:
            lAllSameMaterialIndex = lMaterialLayer.GetIndexArray().GetAt(0)

    if lAllSameMaterial:
        lMaterial = pNode.GetMaterial(lAllSameMaterialIndex)
        if not lMaterial:
            lMaterial = CreateDefaultMaterial(pScene)

        lTmpIndex, lScaleU, lScaleV, lTranslationU, lTranslationV = ConvertToPBRMaterial(lMaterial)
        lPrimitivesList.append(CreatePrimitiveRaw(
            lTmpIndex, False,
            lScaleU, lScaleV, lTranslationU, lTranslationV
        ))
    else:
        lMaterialIndices = [-1]*pMesh.GetPolygonCount()
        lMaterialsPrimitivesMap = {}
        lIsMaterialInSecondLayer = {}
        for i in range(pMesh.GetElementMaterialCount()):
            lMaterialLayer = pMesh.GetElementMaterial(i)
            lIndexArray = lMaterialLayer.GetIndexArray()
            lIsInSecondLayer = lMaterialLayer == lSecondMaterialLayer
            if lMaterialLayer.GetMappingMode() == FbxLayerElement.eByPolygon:
                for k in range(len(lMaterialIndices)):
                    if lIndexArray.GetAt(k) >= 0:
                        # index in top material layer will overwrite the bottom material layer
                        lMaterialIndices[k] = lIndexArray.GetAt(k)
                    lIsMaterialInSecondLayer[lIndexArray.GetAt(k)] = lIsInSecondLayer
            elif lMaterialLayer.GetMappingMode() == FbxLayerElement.eAllSame:
                lIdx = lIndexArray.GetAt(0)
                if lIdx:
                    if lIdx >= 0:
                        for k in range(len(lMaterialIndices)):
                            lMaterialIndices[k] = lIdx
                lIsMaterialInSecondLayer[lIdx] = lIsInSecondLayer
        for lIdx in lMaterialIndices:
            if not lIdx in lMaterialsPrimitivesMap:
                lMaterial = pNode.GetMaterial(lIdx)
                if not lMaterial:
                    lMaterial = CreateDefaultMaterial(pScene)
                lGLTFMaterialIdx, lScaleU, lScaleV, lTranslationU, lTranslationV = ConvertToPBRMaterial(lMaterial)
                lMaterialsPrimitivesMap[lIdx] = len(lPrimitivesList)
                lPrimitivesList.append(CreatePrimitiveRaw(
                    lGLTFMaterialIdx, lIsMaterialInSecondLayer[lIdx],
                    lScaleU, lScaleV, lTranslationU, lTranslationV
                ))

    range3 = range(3)
    lVertexCount = 0

    lNeedHash = False
    if lNormalLayer:
        if lNormalLayer.GetMappingMode() == FbxLayerElement.eByPolygonVertex:
            lNeedHash = True
    if lVertexColorLayer:
        if lVertexColorLayer.GetMappingMode() == FbxLayerElement.eByPolygonVertex:
            lNeedHash = True
    if lUvLayer:
        if lUvLayer.GetMappingMode() == FbxLayerElement.eByPolygonVertex:
            lNeedHash = True
    if lUv2Layer:
        if lUv2Layer.GetMappingMode() == FbxLayerElement.eByPolygonVertex:
            lNeedHash = True

    for i in range(pMesh.GetPolygonCount()):
        if lAllSameMaterial:
            lPrimitive = lPrimitivesList[0]
        else:
            lMaterialIndex = lMaterialIndices[i]
            lPrimitive = lPrimitivesList[lMaterialsPrimitivesMap[lMaterialIndex]]
        # Mesh should be triangulated
        for j in range3:
            lControlPointIndex = pMesh.GetPolygonVertex(i, j)
            if lNeedHash:
                vertexKeyList = []
                vertexKeyList += lPositions[lControlPointIndex]
            if lNormalLayer:
                lNormal = GetVertexAttribute(lNormalLayer, lControlPointIndex, lVertexCount)
                if lNeedHash:
                    vertexKeyList += lNormal
            if lVertexColorLayer:
                lVertexColor = GetVertexAttribute(lVertexColorLayer, lControlPointIndex, lVertexCount)
                lVertexColor = [lVertexColor.mRed, lVertexColor.mGreen, lVertexColor.mBlue, lVertexColor.mAlpha]
                lVertexColor = [round(i * 255) for i in lVertexColor]
                if lNeedHash:
                    vertexKeyList += lVertexColor
            if lUvLayer:
                # PENDING GetTextureUVIndex?
                lUv = GetVertexAttribute(lUvLayer, lControlPointIndex, lVertexCount)
                if lNeedHash:
                    vertexKeyList += lUv
            if lUv2Layer:
                lUv2 = GetVertexAttribute(lUv2Layer, lControlPointIndex, lVertexCount)
                if lNeedHash:
                    vertexKeyList += lUv2

            lVertexCount += 1

            if lNeedHash:
                vertexKey = tuple(vertexKeyList)
            else:
                vertexKey = lControlPointIndex

            if not vertexKey in lPrimitive['indicesMap']:
                lIndex = len(lPrimitive['positions'])
                lPrimitive['positions'].append(lPositions[lControlPointIndex])
                if lNormalLayer and lNormal: # incase unsupported mapping mode returns none.
                    lPrimitive['normals'].append(lNormal)
                if lVertexColorLayer and lVertexColor: # incase unsupported mapping mode returns none.
                    lPrimitive['vertexColors'].append(lVertexColor)
                # PENDING
                # Texcoord may be put in the second layer
                if lPrimitive['useTexcoords1']:
                    if lUv2Layer:
                        if lUv2: # incase unsupported mapping mode returns none.
                            lPrimitive['texcoords0'].append(lUv2)
                    else:
                        if lUv: # incase unsupported mapping mode returns none.
                            lPrimitive['texcoords0'].append(lUv)
                else:
                    if lUvLayer:
                        if lUv: # incase unsupported mapping mode returns none.
                            lPrimitive['texcoords0'].append(lUv)
                    if lUv2Layer:
                        if lUv2: # incase unsupported mapping mode returns none.
                            lPrimitive['texcoords1'].append(lUv2)
                if hasSkin:
                    lPrimitive['joints'].append(lJoints[lControlPointIndex])
                    lPrimitive['weights'].append(lWeights[lControlPointIndex])

                lPrimitive['indicesMap'][vertexKey] = lIndex
            else:
                lIndex = lPrimitive['indicesMap'][vertexKey]

            lPrimitive['indices'].append(lIndex)


    lGLTFPrimitivesList = []
    for i in range(len(lPrimitivesList)):
        lPrimitive = lPrimitivesList[i]
        lGLTFPrimitive = {
            'attributes': {
                'POSITION': CreateAttributeBuffer(lPrimitive['positions'], 'f', 3)
            },
            'material': lPrimitive['material']
        }
        if len(lPrimitive['normals']) > 0:
            lGLTFPrimitive['attributes']['NORMAL'] = CreateAttributeBuffer(lPrimitive['normals'], 'f', 3)
        if len(lPrimitive['vertexColors']) > 0:
            lGLTFPrimitive['attributes']['COLOR_0'] = CreateAttributeBuffer(lPrimitive['vertexColors'], 'B', 4, True)
        if len(lPrimitive['texcoords0']) > 0:
            ProcessUV(
                lPrimitive['texcoords0'],
                lPrimitive['scaleU'], lPrimitive['scaleV'],
                lPrimitive['translationU'], lPrimitive['translationV']
            )
            lGLTFPrimitive['attributes']['TEXCOORD_0'] = CreateAttributeBuffer(lPrimitive['texcoords0'], 'f', 2)
        if len(lPrimitive['texcoords1']) > 0:
            ProcessUV(
                lPrimitive['texcoords1'],
                lPrimitive['scaleU'], lPrimitive['scaleV'],
                lPrimitive['translationU'], lPrimitive['translationV']
            )
            lGLTFPrimitive['attributes']['TEXCOORD_1'] = CreateAttributeBuffer(lPrimitive['texcoords1'], 'f', 2)
        if len(lPrimitive['joints']) > 0:
            # PENDING UNSIGNED_SHORT will have bug.
            lGLTFPrimitive['attributes']['JOINTS_0'] = CreateAttributeBuffer(lPrimitive['joints'], 'H', 4)
            # TODO Seems most engines needs VEC4 weights.
            lGLTFPrimitive['attributes']['WEIGHTS_0'] = CreateAttributeBuffer(lPrimitive['weights'], 'f', 4)

        if len(lPrimitive['positions']) >= 0xffff:
            #Use unsigned int in element indices
            lIndicesType = 'I'
        else:
            lIndicesType = 'H'
        lGLTFPrimitive['indices'] = CreateIndicesBuffer(lPrimitive['indices'], lIndicesType)

        lGLTFPrimitivesList.append(lGLTFPrimitive)

    return lGLTFPrimitivesList

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
    lMesh = pNode.GetMesh()
    # PENDING If invisible node will have all children invisible.
    if pNode.GetVisibility() and lMesh:
        lMeshKey = lNodeName
        lMeshName = lMesh.GetName()
        if lMeshName == '':
            lMeshName = lMeshKey

        lGLTFMesh = {'name' : lMeshName, "primitives": []}

        # If any attribute of this node have skinning data
        # (Mesh splitted by material may have multiple MeshAttribute in one node)
        lHasSkin = lMesh.GetDeformerCount(FbxDeformer.eSkin) > 0
        lGLTFSkin = None
        lClusters = {}

        if lHasSkin:
            lSkinIdx = CreateSkin()
            lGLTFSkin = lib_skins[lSkinIdx]
            lGLTFNode['skin'] = lSkinIdx

        if lMesh.GetLayer(0):
            for i in range(pNode.GetNodeAttributeCount()):
                lNodeAttribute = pNode.GetNodeAttributeByIndex(i)
                if lNodeAttribute.GetAttributeType() == FbxNodeAttribute.eMesh:
                    lGLTFMesh['primitives'] += ConvertMesh(pScene, lNodeAttribute, pNode, lGLTFSkin, lClusters)

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

    elif pNode.GetCamera():
        # Camera attribute
        lCameraKey = ConvertCamera(pNode.GetCamera())
        lGLTFNode['camera'] = lCameraKey

    if pNode.GetChildCount() > 0:
        lGLTFNode['children'] = []
        for i in range(pNode.GetChildCount()):
            lChildNodeIdx = ConvertSceneNode(pScene, pNode.GetChild(i), pPoseTime)
            if lChildNodeIdx >= 0:
                lGLTFNode['children'].append(lChildNodeIdx)

    return GetNodeIdx(pNode)

def ConvertScene(pScene, pPoseTime):
    lRoot = pScene.GetRootNode()

    lGLTFScene = {'nodes' : []}

    lSceneIdx = len(lib_scenes)
    lib_scenes.append(lGLTFScene)

    for i in range(lRoot.GetChildCount()):
        lNodeIdx = ConvertSceneNode(pScene, lRoot.GetChild(i), pPoseTime)
        if lNodeIdx >= 0:
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
    return [(a[0] + b[0]) / 2.0, (a[1] + b[1]) / 2.0, (a[2] + b[2]) / 2.0]
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
        scale0 = math.sin((1.0 - t) * omega) / float(sinom)
        scale1 = math.sin(t * omega) / float(sinom)
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
        lNumFrames = int(math.ceil(lDuration / float(pSampleRate)))

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

            # Convert quaternion to axis angle
            # PENDING. minus pStartTime or lStartTimeDouble?
            lTimeChannel.append(lSecondDouble - pStartTime)

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
def PrepareSceneNode(pNode):
    global _nodeCount
    _nodeIdxMap[pNode.GetUniqueID()] = _nodeCount
    _nodeCount = _nodeCount + 1

    for k in range(pNode.GetChildCount()):
        PrepareSceneNode(pNode.GetChild(k))

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


def FindFileInDir(pFileName, pDir):
    for root, dirs, files in os.walk(pDir):
        for file in files:
            if file == pFileName:
                return os.path.join(root, file)


def CorrectImagesPaths(pFilePath):
    lFileFullPath = os.path.join(os.getcwd(), pFilePath)
    lFileExtension = pFilePath.rsplit('.', 1)[1].lower()
    for lGLTFImage in lib_images:
        lUri = lGLTFImage['uri']
        lUri = lUri.replace(r'[\\\/]+', os.path.sep)
        # FBX SDK extracts zip input files to temp folder, so use lGLTFImage uri instead to find temp folder
        if lFileExtension == 'zip':
            lFileDir = os.path.dirname(lGLTFImage['uri'])
        else:
            lFileDir = os.path.dirname(lFileFullPath)
        lUri = FindFileInDir(os.path.basename(lUri), lFileDir)
        if lUri:
            lRelUri = os.path.relpath(lUri, lFileDir)
            # If an alternative output directory is specified, copy all textures to output directory
            if lOutputDirSpecified:
                lOutputDir = os.path.dirname(args.output)
                # If textures are in a dir and that dir does not yet exist, create it
                lRelTextureDir = os.path.dirname(lRelUri)
                lFullTextureDir = os.path.join(lOutputDir, lRelTextureDir)
                if not os.path.exists(lFullTextureDir):
                    os.makedirs(lFullTextureDir)
                shutil.copyfile(lUri, os.path.join(lOutputDir, lRelUri))
            if not lRelUri == lGLTFImage['uri']:
                print('Changed texture file path from "' + lGLTFImage['uri'] + '" to "' + lRelUri + '"')
            lGLTFImage['uri'] = lRelUri
        else:
            print("Can\'t find texture file in the folder, path: " + lGLTFImage['uri'])


def EmbedImagesToBinary(pBuffer, pFilePath):
    lFileFullPath = os.path.join(os.getcwd(), pFilePath)
    lFileDir = os.path.dirname(lFileFullPath)
    for lGLTFImage in lib_images:
        lUri = lGLTFImage['uri']
        lImgBytes = None

        if not os.path.isfile(lUri):
            lUri = lUri.replace(r'[\\\/]+', os.path.sep)
            lUri = FindFileInDir(os.path.basename(lUri), lFileDir)
        try:
            f = open(lUri, 'rb')
            lImgBytes = f.read()
        except:
            print("Can\'t find texture file in the folder, path: " + lGLTFImage['uri'])

        if not lImgBytes:
            continue

        lBufferViewIdx = len(lib_buffer_views)

        lGLTFImage['bufferView'] = lBufferViewIdx
        del lGLTFImage['uri']

        lBufferView = {
            'buffer': 0,
            'byteLength': len(lImgBytes),
            'byteOffset': len(pBuffer)
            # TODO Mime type
        }

        lib_buffer_views.append(lBufferView)

        pBuffer.extend(lImgBytes)
        # 4-byte-aligned
        lAlignedLen = (len(lImgBytes) + 3) & ~3
        for i in range(lAlignedLen - len(lImgBytes)):
            pBuffer.extend(b' ')

    return pBuffer

# FIXME
# http://help.autodesk.com/view/FBX/2017/ENU/?guid=__cpp_ref_fbxtime_8h_html
TIME_INFINITY = FbxTime(0x7fffffffffffffff)

def Convert(
    filePath,
    ouptutFile = '',
    excluded = [],
    animFrameRate = 1.0 / 20.0,
    startTime = 0,
    duration = 1000,
    poseTime = TIME_INFINITY,
    beautify = False,
    binary = False
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

        # PENDING, if it will affect the conversion after.
        FbxAxisSystem.OpenGL.ConvertScene(lScene)

        # Do it before SplitMeshesPerMaterial or the vertices of split mesh will be wrong.
        PrepareBakeTransform(lScene.GetRootNode())
        lScene.GetRootNode().ConvertPivotAnimationRecursive(None, FbxNode.eDestinationPivot, 60)

        # PENDING Triangulate before SplitMeshesPerMaterial or it will not work.
        fbxConverter.Triangulate(lScene, True)

        # SplitMeshPerMaterial will fail if the mapped material is not per face (FbxLayerElement::eByPolygon) or if a material is multi-layered.
        # http://help.autodesk.com/view/FBX/2017/ENU/?guid=__cpp_ref_class_fbx_geometry_converter_html
        # TODO May have bug
        # if not fbxConverter.SplitMeshesPerMaterial(lScene, True):
        #     print('SplitMeshesPerMaterial fail')

        PrepareSceneNode(lScene.GetRootNode())

        if not ignoreScene:
            lSceneIdx = ConvertScene(lScene, poseTime)
        if not ignoreAnimation:
            ConvertAnimation(lScene, animFrameRate, startTime, duration)

        #Merge binary data and write to a binary file
        lBin = bytearray()

        CreateBufferViews(0, lBin)

        if binary:
            lBin = EmbedImagesToBinary(lBin, filePath)
        else:
            CorrectImagesPaths(filePath)

        lBufferName = lBasename + '.bin'
        if binary:
            lib_buffers.append({
                'byteLength' : len(lBin)
            })
        else:
            lib_buffers.append({
                'byteLength' : len(lBin),
                'uri' : os.path.basename(lBufferName)
            })

        #Output json
        lJSON = {
            'asset': {
                'generator': 'ClayGL - fbx2gltf',
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
            lJSON['cameras'] = lib_cameras
        if len(lib_skins) > 0:
            lJSON['skins'] = lib_skins
        if len(lib_materials) > 0:
            lJSON['materials'] = lib_materials
        if len(lib_images) > 0:
            lJSON['images'] = lib_images
        if len(lib_samplers) > 0:
            lJSON['samplers'] = lib_samplers
        if len(lib_textures) > 0:
            lJSON['textures'] = lib_textures
        if len(lib_animations) > 0:
            lJSON['animations'] = lib_animations
        #Default scene
        if not ignoreScene:
            lJSON['scene'] = lSceneIdx

        if binary:
            lOutFile = open(ouptutFile, 'wb')
            lJSONStr = json.dumps(lJSON, sort_keys = True, separators=(',', ':'))
            lJSONBinary = bytearray(lJSONStr.encode(encoding='UTF-8'))
            # 4-byte-aligned
            lAlignedLen = (len(lJSONBinary) + 3) & ~3
            for i in range(lAlignedLen - len(lJSONBinary)):
                lJSONBinary.extend(b' ')

            lOut = bytearray()
            lSize = 12 + 8 + len(lJSONBinary) + 8 + len(lBin)
            # Magic number
            lOut.extend(struct.pack('<I', 0x46546C67))
            lOut.extend(struct.pack('<I', 2))
            lOut.extend(struct.pack('<I', lSize))
            lOut.extend(struct.pack('<I', len(lJSONBinary)))
            lOut.extend(struct.pack('<I', 0x4E4F534A))
            lOut += lJSONBinary
            lOut.extend(struct.pack('<I', len(lBin)))
            lOut.extend(struct.pack('<I', 0x004E4942))
            lOut += lBin
            lOutFile.write(lOut)
            lOutFile.close()

        else:
            lOutFile = open(ouptutFile, 'w')
            lBinFile = open(lBasename + ".bin", 'wb')
            lBinFile.write(lBin)
            lBinFile.close()

            indent = None
            seperator = ':'

            if beautify:
                indent = 2
                seperator = ': '
            lOutFile.write(json.dumps(lJSON, indent = indent, sort_keys = True, separators=(',', seperator)))
            lOutFile.close()

if __name__ == "__main__":

    parser = argparse.ArgumentParser(description='FBX to glTF converter', add_help=True)
    parser.add_argument('-e', '--exclude', type=str, default='', help="Data excluded. Can be: scene,animation")
    parser.add_argument('-t', '--timerange', default='0,1000', type=str, help="Export animation time, in format 'startSecond,endSecond'")
    parser.add_argument('-o', '--output', default='', type=str, help="Ouput glTF file path")
    parser.add_argument('-f', '--framerate', default=20, type=float, help="Animation frame per second")
    parser.add_argument('-p', '--pose', default=0, type=float, help="Start pose time")
    parser.add_argument('-q', '--quantize', action='store_true', help="Quantize accessors with WEB3D_quantized_attributes extension")
    parser.add_argument('-b', '--binary', action="store_true", help="Export glTF-binary")
    parser.add_argument('--beautify', action="store_true", help="Beautify json output.")
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
        lOutputDirSpecified = False
        lBasename, lExt = os.path.splitext(args.file)
        if args.binary:
            args.output = lBasename + '.glb'
        else:
            args.output = lBasename + '.gltf'
    else:
        lOutputDirSpecified = True

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
        1.0 / float(args.framerate),
        lStartTime,
        lDuration,
        lPoseTime,
        args.beautify,
        args.binary
    )

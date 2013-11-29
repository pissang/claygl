import cv2
import numpy as np
import sys
import getopt

fileInput = None
fileOutput = None

opts, args = getopt.getopt(sys.argv[1:], "i:o:", ["input=", "ouput="])

for k, v in opts:
    if k in ("--input", "-i"):
        fileInput = v
    if k in ("--output", "-o"):
        fileOutput = v

if fileInput == None or fileOutput == None:
    print "Input or output wrong"
    sys.exit()

ext = fileInput.split('.')[-1]

if ext == "tif":
    tif = cv2.imread(fileInput, -1)
    height = tif.shape[0]
    width = tif.shape[1]
    png = np.zeros((height, width, 4), np.uint8)
    tif = np.array(tif, np.float)
    tif /= 256.0    # convert to [0. - 1.0]
    # Tone mapping with reinhard's operator
    
    v = np.zeros((height, width), np.float)
    e = np.zeros((height, width), np.uint32)
    tmp = np.amax(tif, axis=2)
    mask = tmp != 0.0
    np.frexp(tmp, v, e)
    v[mask] = v[mask] * 256 / tmp[mask]
    v[tmp == 0] = 0.0
    e[tmp == 0] = -128
    png[:,:,0] = tif[:,:,0] * v
    png[:,:,1] = tif[:,:,1] * v
    png[:,:,2] = tif[:,:,2] * v
    png[:,:,3] = e + 128
    params = list()
    params.append(cv2.cv.CV_IMWRITE_PNG_COMPRESSION)
    params.append(10)
    cv2.imwrite(fileOutput, png, params)

if ext == "png":
    png = cv2.imread(fileInput, -1)
    height = png.shape[0]
    width = png.shape[1]

    tif = np.zeros((height, width, 3), np.uint16)
    v = np.zeros((height, width), np.float)
    e = png[:,:,3]
    # np.ldexp(1, e - 128, v)
    v = np.power(2.0, e - 128)
    v[e==0] = 0
    tif[:,:,0] = png[:,:,0] * v
    tif[:,:,1] = png[:,:,1] * v
    tif[:,:,2] = png[:,:,2] * v
    cv2.imwrite(fileOutput, tif)

        
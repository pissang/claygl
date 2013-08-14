import cv2
import numpy as np
import math
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
    width = tif.shape[0]
    height = tif.shape[1]
    png = np.zeros((width, height, 4), np.uint8)

    tif = tif / 65535.0
    a = np.clip(np.amax(tif, axis=2), 1e-6, 1)
    np.ceil(a * 255) / 255
    a = a.reshape(width, height, 1)
    png[:,:,0:3] = tif / a * 255
    a = a.reshape(width, height)
    png[:,:,3] = a * 255
    cv2.imwrite(fileOutput, png)

elif ext == "png":
    png = cv2.imread(fileInput, -1)
    png = png / 255.0
    a = png[:,:,3:4]

    tif = np.zeros((png.shape[0], png.shape[1], 3), np.uint16)
    tif[:,:,0:3] = png[:,:,0:3] * a * 65535.0

    cv2.imwrite(fileOutput, tif)

else:
    print "Input file is not png or tif format"
    sys.exit()

print("Successfully converted " + fileInput + " to " + fileOutput)

function get(options: {
  url: string;
  responseType?: XMLHttpRequest['responseType'];
  onprogress?: (percent: number, loaded: number, total: number) => void;
  onload?: (data: any) => void;
  onerror?: () => void;
}) {
  const xhr = new XMLHttpRequest();

  xhr.open('get', options.url);
  // With response type set browser can get and put binary data
  // https://developer.mozilla.org/en-US/docs/DOM/XMLHttpRequest/Sending_and_Receiving_Binary_Data
  // Default is text, and it can be set
  // arraybuffer, blob, document, json, text
  xhr.responseType = options.responseType || 'text';

  const onprogress = options.onprogress;
  if (onprogress) {
    //https://developer.mozilla.org/en-US/docs/DOM/XMLHttpRequest/Using_XMLHttpRequest
    xhr.onprogress = function (e) {
      if (e.lengthComputable) {
        const percent = e.loaded / e.total;
        onprogress(percent, e.loaded, e.total);
      } else {
        onprogress(0, 0, 0);
      }
    };
  }
  xhr.onload = function () {
    if (xhr.status >= 400) {
      options.onerror && options.onerror();
    } else {
      options.onload && options.onload(xhr.response);
    }
  };
  if (options.onerror) {
    xhr.onerror = options.onerror;
  }
  xhr.send(null);
}

export { get };

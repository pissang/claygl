const { writeFileSync } = require('fs');
const glob = require('glob');
const path = require('path');

const html = (strings, ...vars) => {
  let result = '';
  strings.forEach((str, i) => {
    result += `${str}${i === strings.length - 1 ? '' : vars[i]}`;
  });
  return result;
};

glob(path.resolve(__dirname, '../example/*.html'), async (err, files) => {
  const fileNames = files.map((file) => path.basename(file, '.html'));

  // prettier-ignore
  const tpl = html`
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      body {
        margin: 0;
        font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen,
    Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue, sans-serif;
      }
      .container {
        width: 100%;
        height: 100%;
      }
      .nav {
        width: 200px;
        height: 100%;
        overflow-y: scroll;
        border-right: 1px solid #eee;
      }
      .nav ul {
        margin: 0px;
        padding: 0px;
        margin-top: 10px;
      }
      .nav ul li {
        list-style: none;
        padding: 5px 20px;
        margin: 0;
        font-size: 16px;
      }
      .main {
        position: absolute;
        top: 0;
        bottom: 0;
        right: 0;
        left: 200px;
      }
      .viewport {
        position: absolute;
        left: 10px;
        right: 10px;
        top: 10px;
        bottom: 10px;
        border-radius: 5px;
        box-shadow: 0 0 10px rgba(0, 0, 0, 0.2);
        overflow: hidden;
      }
      iframe {
        border: none;
        width: 100%;
        height: 100%;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="nav">
        <ul>
          ${fileNames.map((fileName) => html`
            <li><a href="${fileName}.html" data-hash="${fileName}" target="viewport">${fileName}</a></li>`).join('\n')}
        </ul>
      </div>
      <div class="main">
        <div class="viewport">
          <iframe name="viewport"></iframe>
        </div>
      </div>
    </div>

    <script>
      const iframeDom = document.querySelector('iframe');
      Array.from(document.querySelectorAll('.nav a')).forEach(link => {
        link.addEventListener('click', () => {
          window.location.hash = '#' + link.getAttribute('data-hash')
        });
      })

      iframeDom.onload = () => {
        document.title = iframeDom.contentDocument.title;
      }

      function updateFromHash() {
        const testName = window.location.hash.slice(1);
        if (testName) {
          iframeDom.src = testName + '.html'
        }
      }
      updateFromHash();
      window.onhashchange = updateFromHash;
    </script>
  </body>
</html>
`;

  writeFileSync(path.resolve(__dirname, '../example/index.html'), tpl, 'utf-8');
});

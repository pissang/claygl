const { writeFileSync, existsSync } = require('fs');
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
  const testCases = files
    .map((file) => path.basename(file, '.html'))
    .filter((file) => file !== 'index')
    .map((file) => ({
      name: file,
      isTS: existsSync(path.join(__dirname, `../example/${file}.ts`))
    }));

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
      .nav ul li a {
        color: #444;
        text-decoration: none;
      }
      .nav ul li.current {
        background-color: #8d00be;
      }
      .nav ul li.current a {
        color: #fff;
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
          ${testCases.map((testCase) => html`
            <li><a href="${testCase.name}.html" data-hash="${testCase.name}" target="viewport">${testCase.name}${testCase.isTS ? '(ts)' : ''}</a></li>`).join('\n')}
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

      function updateFromHash(isFirst) {
        const testName = window.location.hash.slice(1);
        if (testName) {
          iframeDom.src = testName + '.html'
        }

        !isFirst && Array.from(document.querySelectorAll('.nav a')).forEach(link => {
          link.parentNode.classList.remove('current');
        })
        const current = document.querySelector('.nav a[data-hash=' + testName + ']');
        if (current) {
          current.parentNode.classList.add('current')
          if (isFirst) {
            setTimeout(() => {
              current.scrollIntoView({
                behavior: 'smooth'
              });
            }, 100)
          }
        }
      }
      updateFromHash(true);
      window.onhashchange = () => updateFromHash();
    </script>
  </body>
</html>
`;

  writeFileSync(path.resolve(__dirname, '../example/index.html'), tpl, 'utf-8');
});

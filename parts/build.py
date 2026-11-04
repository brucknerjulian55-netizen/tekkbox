import pathlib
d = pathlib.Path(__file__).parent
app = (d / 'app.js').read_text(encoding='utf8').replace('/*__SOUNDS__*/', (d / 'sounds.js').read_text(encoding='utf8')).replace('/*__BUILD__*/', (d / 'build-mode.js').read_text(encoding='utf8')).replace('/*__LIVE__*/', (d / 'live.js').read_text(encoding='utf8'))
import base64
b = lambda p: base64.b64encode((d / p).read_bytes()).decode()
fonts = ''
html = (d / 'shell.html').read_text(encoding='utf8').replace('/*__APP__*/', app).replace('/*__DESIGN__*/', fonts + (d / 'design.css').read_text(encoding='utf8')).replace('__LOGO__', 'data:image/jpeg;base64,' + b('logo.jpg'))
(d.parent / 'tekkbox.html').write_text(html, encoding='utf8')
print(len(html))

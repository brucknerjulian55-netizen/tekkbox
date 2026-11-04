import pathlib
d = pathlib.Path(__file__).parent
app = (d / 'app.js').read_text(encoding='utf8').replace('/*__SOUNDS__*/', (d / 'sounds.js').read_text(encoding='utf8')).replace('/*__BUILD__*/', (d / 'build-mode.js').read_text(encoding='utf8')).replace('/*__LIVE__*/', (d / 'live.js').read_text(encoding='utf8'))
html = (d / 'shell.html').read_text(encoding='utf8').replace('/*__APP__*/', app)
(d.parent / 'tekkbox.html').write_text(html, encoding='utf8')
print(len(html))

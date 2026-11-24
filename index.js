const express = require('express')
const { episodes } = require('./dragonball')
const app = express()
const PORT = process.env.PORT || 7300

const POSTER = 'https://raw.githubusercontent.com/xami666999-lgtm/dragonball-drive/main/covers/dragonball-kai.jpg'
const DESC = 'Dragon Ball from Google Drive. Original Recut, Kai, Super, and the movies. One series with every season inside.'

const manifest = {
  id: 'com.dragonball.drive',
  version: '1.0.0',
  name: 'Dragon Ball Drive',
  logo: 'https://raw.githubusercontent.com/xami666999-lgtm/dragonball-drive/main/covers/dragonball-kai.jpg',
  description: DESC,
  resources: ['catalog', 'meta', 'stream'],
  types: ['series'],
  catalogs: [
    { type: 'series', id: 'dragonball', name: 'Dragon Ball', extra: [{ name: 'search', isRequired: false }] },
  ],
  idPrefixes: ['dragonball'],
}

app.use((req, res, next) => { res.set('Access-Control-Allow-Origin', '*'); next() })
app.get('/manifest.json', (_req, res) => res.json(manifest))

app.get('/catalog/series/dragonball.json', (req, res) => {
  res.json({ metas: [{ id: 'dragonball', type: 'series', name: 'Dragon Ball', poster: POSTER, description: DESC }] })
})

app.get('/meta/series/:id.json', (req, res) => {
  const videos = []
  let n = 1
  const seasonNum = { db: 1, kai: 2, super: 3, movies: 4 }
  const seasonName = { db: 'Dragon Ball', kai: 'Dragon Ball Kai', super: 'Dragon Ball Super', movies: 'Movies' }
  for (const sid of Object.keys(episodes)) {
    for (const e of episodes[sid]) {
      videos.push({
        id: 'dragonball:' + sid + ':' + e[0],
        title: (seasonName[sid] || sid) + ' - ' + e[1],
        season: seasonNum[sid] || 1,
        episode: n++,
        overview: seasonName[sid] || '',
      })
    }
  }
  res.json({ meta: { id: 'dragonball', type: 'series', name: 'Dragon Ball', poster: POSTER, description: DESC, videos } })
})

function base(req) {
  const host = req.get('host')
  const proto = (req.headers['x-forwarded-proto'] || 'https').split(',')[0]
  return proto + '://' + host
}

app.get('/stream/series/:id.json', (req, res) => {
  const parts = req.params.id.split(':')
  if (parts[0] !== 'dragonball') return res.json({ streams: [] })
  const ep = (episodes[parts[1]] || []).find((e) => e[0] === parts[2])
  if (!ep) return res.json({ streams: [] })
  res.json({ streams: [{ name: 'Dragon Ball', title: ep[1], url: base(req) + '/play/' + ep[2] }] })
})

app.get('/play/:fileId', async (req, res) => {
  try {
    const id = req.params.fileId
    const warn = await fetch('https://drive.google.com/uc?export=download&id=' + id, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    })
    const html = await warn.text()
    const uuid = (html.match(/name="uuid" value="([^"]+)"/) || [])[1] || ''
    const url = 'https://drive.usercontent.google.com/download?id=' + id + '&export=download&confirm=t' + (uuid ? '&uuid=' + uuid : '')
    const r = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0' } })
    const disp = r.headers.get('content-disposition') || ''
    const name = (disp.match(/filename="([^"]+)"/) || [])[1] || ''
    const type = /\.mkv/i.test(name) ? 'video/x-matroska' : /\.mp4|\.m4v/i.test(name) ? 'video/mp4' : (r.headers.get('content-type') || 'video/mp4')
    res.set('Content-Type', type)
    res.set('Accept-Ranges', 'bytes')
    if (r.headers.get('content-length')) res.set('Content-Length', r.headers.get('content-length'))
    const { Readable } = require('stream')
    Readable.fromWeb(r.body).pipe(res)
  } catch (err) {
    res.status(502).send('stream failed')
  }
})

app.get('/', (_req, res) => res.redirect('/manifest.json'))
app.listen(PORT, () => console.log('Dragon Ball Drive addon on', PORT))

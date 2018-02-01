const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv')
const path = require('path')
const app = express()

// Load environment variables from .env file
dotenv.load()

app.set('port', process.env.PORT || 3001)

app.use(cors())

app.use('/static', express.static('static'))
app.use('/bower_components', express.static('bower_components'))
app.use('/src', express.static('src'))
//app.use(express.static('static'));
//app.use(express.static(path.join(__dirname, 'static')))

app.get('/', (req, res, next) => {
  res.json({running: true})
})

app.listen(app.get('port'), function() {
	console.log('Express server listening on port ' + app.get('port'))
})

module.exports = app;

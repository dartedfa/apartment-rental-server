const app = require('./app')
const port = process.env.PORT || 3001

app.listen(port, () => {
  console.log(`App is running on a port ${port}`)
})

const express = require('express')
const path = require('path')
const http = require('http')
const socketio = require('socket.io')
const Filter = require('bad-words')
const app = express()
const server = http.createServer(app) // add this line when working with sockets, it is an ordinary http server
const io = socketio(server)
const { generateMessage, generateLocationMessage } = require('./utils/messages')
const { addUser, removeUser, getUser, getUsersInRoom } = require('./utils/users')

const publicDirectoryPath = path.join(__dirname, '../public')
app.use(express.static(publicDirectoryPath))

io.on('connection', (socket) => { // listen when somebody navigates to our page

  // listen when somebody joins specific room
  socket.on('join', ({ username, room }, callback) => {
    const { error, user } = addUser({ id: socket.id, username, room })

    if (error) {
      return callback(error)
    }

    socket.join(user.room) // join this specific socket to this specific room

    socket.emit('message', generateMessage('Admin', 'Welcome')) // send message to the specific socket that just joined
    socket.broadcast.to(user.room).emit('message', generateMessage('Admin', `${user.username} has joined!`)) // emit event to all except current socket in specific room
    io.to(user.room).emit('roomData', {
      room: user.room,
      users: getUsersInRoom(user.room)
    })

    callback()
  })

  socket.on("sendMessage", (message, callback) => { // receive message from this socket, receive callback to acknowledge receipt
    const filter = new Filter()

    if (filter.isProfane(message)) {
      return callback('Profanity is not allowed!')
    }

    const user = getUser(socket.id)
    if (!user) return

    io.to(user.room).emit("message", generateMessage(user.username, message))

    callback()
  })

  socket.on('sendLocation', (message, callback) => {
    const user = getUser(socket.id)
    io.to(user.room).emit('locationMessage', generateLocationMessage(user.username, `https://google.com/maps?q=${message.latitude},${message.longitude}`))
    callback()
  })

  socket.on('disconnect', () => {
    const user = removeUser(socket.id)
    if (user) {
      io.to(user.room).emit('message', generateMessage('Admin', `${user.username} has left!`))
      io.to(user.room).emit('roomData', {
        room: user.room,
        users: getUsersInRoom(user.room)
      })
    }

  })
})

const port = process.env.PORT || 3003
server.listen(port, () => console.log('listening on port 3003')) // instead of app.listen we use server.listen 
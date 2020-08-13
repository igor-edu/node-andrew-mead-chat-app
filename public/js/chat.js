const socket = io()

// dom elements
const $messageForm = document.querySelector('#message-form')
const $messageFormInput = $messageForm.querySelector('input')
const $messageFormButton = $messageForm.querySelector('button')
const $locationButton = document.querySelector('#send-location')
const $messages = document.querySelector('#messages')

// templates
const messageTemplate = document.querySelector('#message-template').innerHTML
const locationTemplate = document.querySelector('#location-template').innerHTML
const sidebarTemplate = document.querySelector('#sidebar-template').innerHTML

// options
const { username, room } = Qs.parse(location.search, { ignoreQueryPrefix: true })

const autoscroll = () => {
  const $newMessage = $messages.lastElementChild // access the last message

  // height of the new message, last message
  const newMessageStyles = getComputedStyle($newMessage)
  const newMessageMargin = parseInt(newMessageStyles.marginBottom)
  const newMessageHeight = $newMessage.offsetHeight + newMessageMargin

  // visible height
  const visibleHeight = $messages.offsetHeight

  // height of messages container
  const containerHeight = $messages.scrollHeight

  // how far have i scrolled
  const scrollOffset = $messages.scrollTop + visibleHeight

  if (containerHeight - newMessageHeight <= scrollOffset) {
    $messages.scrollTop = $messages.scrollHeight
  }
}

socket.on('locationMessage', (obj) => {
  // console.log(url)
  const html = Mustache.render(locationTemplate, {
    url: obj.url,
    username: obj.username,
    createdAt: moment(obj.createdAt).format('h:mm a')
  })
  // console.log('html from location message: ', html)
  $messages.insertAdjacentHTML('beforeend', html)

  autoscroll()
})

socket.on('message', (message) => {
  // console.log("new message received from the server:", message)
  const html = Mustache.render(messageTemplate, { // render the template
    username: message.username,
    message: message.text, // provide value to be used in the template
    createdAt: moment(message.createdAt).format('h:mm a')
  })
  // console.log(html)
  $messages.insertAdjacentHTML('beforeend', html) // insert template rendered above into the messages div

  autoscroll()
})


socket.on('roomData', ({ room, users }) => {
  const html = Mustache.render(sidebarTemplate, {
    room,
    users
  })

  document.querySelector('#sidebar').innerHTML = html
})

$messageForm.addEventListener('submit', (e) => {
  e.preventDefault()

  const message = e.target.elements.message.value

  $messageFormButton.setAttribute('disabled', 'disabled') // disable the form before acknowledgement received from the server
  $messageFormInput.value = ''
  $messageFormInput.focus()

  // last parameter to emit is the function that is called by receiver as acknowledgement
  socket.emit("sendMessage", message, (error) => {
    $messageFormButton.removeAttribute('disabled')

    if (error) {
      return console.log(error)
    }

    console.log('Message delivered, callback called without error')
  })
})

$locationButton.addEventListener('click', () => {
  if (!navigator.geolocation) {
    return alert('Geolocation is not supported by your browser')
  }

  $locationButton.setAttribute('disabled', 'disabled')

  navigator.geolocation.getCurrentPosition((position) => {
    socket.emit('sendLocation', {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude
    }, () => {
      console.log('Location acknowledged by server and shared')
      $locationButton.removeAttribute('disabled')
    })
  })
})

socket.emit('join', { username, room }, (error) => {
  if (error) {
    alert(error)
    location.href = '/'
  }
})
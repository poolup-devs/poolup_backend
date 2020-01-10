const socket = io()

// Elements
const $messageForm = document.querySelector("#message-form")
const $messageFormInput = $messageForm.querySelector("input")
const $messageFormButton = $messageForm.querySelector("button")
const $sendLocationButton = document.querySelector("#send-location")
const $messages = document.querySelector("#messages")

// Temiplates
const messageTemplate = document.querySelector("#message-template").innerHTML 
const locationMessageTemplate = document.querySelector("#location-message-template").innerHTML

//Options
// const { username, room} = Qs.parse(location.search,{ ignoreQueryPrefix: true })
const { userA, userB } = Qs.parse(location.search,{ ignoreQueryPrefix: true })

socket.on("countUpdated", (count) => {
    console.log("The count has been updated! ", count)
})

socket.on("message", (message)=> {
    console.log(message);
    const html = Mustache.render(messageTemplate, {
        username: message.username,
        message: message.text,
        createdAt: moment(message.createdAt).format("h:mm A")
    })
    $messages.insertAdjacentHTML("beforeend", html)
})

// document.querySelector("#increment").addEventListener("click", () => {
//     console.log("Clicked")
//     socket.emit("increment")
// })

$messageForm.addEventListener("submit", (e)=>{
    e.preventDefault()

    $messageFormButton.setAttribute("disabled", "disabled")
    // disable
    const message = e.target.elements.message.value
    socket.emit("sendMessage", message, (error)=>{           // The event Acknowledgement
        $messageFormButton.removeAttribute("disabled")
        $messageFormInput.value = ''
        $messageFormInput.focus()

        if(error){
            return console.log(error)
        }
        console.log("Message delivered")
    })
})

// socket.on("locationMessage", (message)=>{
//         console.log(message)
//         const html = Mustache.render(locationMessageTemplate, {
//         // username: message.username,
//         url: message.url,
//         createdAt: moment(message.createdAt).format("h:mm a")
//     })
//     $messages.insertAdjacentHTML("beforeend", html)
// })

// $sendLocationButton.addEventListener("click", ()=> {
//     if(!navigator.geolocation){
//         return alert("Geolocation not supported")
//     }

//     $sendLocationButton.setAttribute("disabled", "disabled")

//     navigator.geolocation.getCurrentPosition((position)=>{
//         socket.emit("sendLocation", {
//             latitude: position.coords.latitude,
//             longitude:position.coords.longitude
//         }, ()=>{
//             $sendLocationButton.removeAttribute("disabled")
//             console.log("Coordinates sent")
//         })
//     })
// })

socket.emit("join", {userA, userB}, (error) => {
    if(error) {
        // if error, alert error and redirect to home page
        alert(error)
        location.href = '/'
    }
})
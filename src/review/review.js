const mongoose = require('mongoose'); 
const reviewSchema = new mongoose.Schema({
    datePosted: {
        type: Date, 
        default: Date.now 
    }, 
    reviewerUsername: {
        type: String, 
        required: true
    },
    revieweeUsername: {
        type: String, 
        required: true, 
        index: true 
    },  
    rating: {
        type: Number, 
        required: true
    }, 
    body: String, 
    rideId: {
        type: mongoose.Types.ObjectId
    }
}); 

const Review = mongoose.model("Review", reviewSchema); 
module.exports = {Review}; 
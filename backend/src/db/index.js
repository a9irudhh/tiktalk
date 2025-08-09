import mongoose from "mongoose"

const connectDB = async () => {
    try {
        if(!process.env.MONGO_URI){
            throw new Error("Mongo URI is missing")
        }
        const connectionInstance = await mongoose.connect(`${process.env.MONGO_URI}`)
        // console.log(`Connected to DB: ${connectionInstance.connection.host}`)
        
    } catch (error) {
        console.error("Error while connecting to DB", error)
        process.exit(1)
    }
} 

export default connectDB
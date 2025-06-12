import { createClient } from "@supabase/supabase-js"
import { v4 as uuidv4 } from "uuid"
import Router from "koa-router"
import multer from "multer"
import { logger } from "./logger.js"

// Use your existing Supabase client or create one specifically for uploads
// You can import your existing client configuration here
const supabaseUrl = 'https://qpvdjklmliwunjimrtpg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwdmRqa2xtbGl3dW5qaW1ydHBnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIwMzg2MTEsImV4cCI6MjA1NzYxNDYxMX0.FZRpiDZtUVFtjLnNrTqALRWR4ZN1IAj_22VngzaQllw';
const supabase = createClient(supabaseUrl, supabaseKey);
export const uploadRouter = new Router()

// Configure multer for file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
})

// Upload endpoint
uploadRouter.post("/", upload.single("file"), async (ctx) => {
    const userId = ctx.state.user._id
    const file = ctx.request.file

    if (!file) {
        logger.error(`[UPLOAD][NO_FILE] UserId: ${userId}`)
        ctx.response.status = 400
        ctx.response.body = { message: "No file uploaded" }
        return
    }

    logger.info(`[UPLOAD][START] UserId: ${userId}, FileSize: ${file.size}, FileType: ${file.mimetype}`)

    try {
        // Generate a unique filename
        const fileExt = file.originalname.split(".").pop()
        const fileName = `${uuidv4()}.${fileExt}`
        const filePath = `products/${userId}/${fileName}`

        // Upload to Supabase Storage
        const { data, error } = await supabase.storage.from("product-images").upload(filePath, file.buffer, {
            contentType: file.mimetype,
            cacheControl: "3600",
        })

        if (error) {
            logger.error(`[UPLOAD][ERROR] UserId: ${userId}, Error: ${error.message}`)
            ctx.response.status = 500
            ctx.response.body = { message: error.message }
            return
        }

        // Get the public URL
        const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(filePath)

        logger.info(`[UPLOAD][SUCCESS] UserId: ${userId}, FilePath: ${filePath}`)

        ctx.response.body = {
            url: urlData.publicUrl,
            path: filePath,
        }
    } catch (err) {
        logger.error(`[UPLOAD][ERROR] UserId: ${userId}, Error: ${err.message}`)
        ctx.response.status = 500
        ctx.response.body = { message: err.message }
    }
})

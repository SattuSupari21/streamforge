import z from "zod";

const videoFormats = ['video/mp4', 'video/mkv', 'video/webm'];

const uploadSchema = z.object({
    originalname: z.string().min(1, "Filename required"),
    mimetype: z.string().refine((val:any) => videoFormats.includes(val), { message: "Invalid file type" }),
    size: z.number().int().positive(),
});

export default uploadSchema;
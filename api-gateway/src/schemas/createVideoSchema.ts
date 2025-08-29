import z from "zod";

const createVideoSchema = z.object({
    video_id: z.string(),
    title: z.string().optional(),
    description: z.string().optional(),
    uploader_id: z.string().optional(),
});

export default createVideoSchema;
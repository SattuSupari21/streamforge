import z from "zod";

// Zod schema for the transcoding job payload
const transcodingJobSchema = z.object({
    bucket: z.string().min(1),
    filename: z.string().min(1),
});

export default transcodingJobSchema;
import z from "zod";

const videoIdSchema = z.string().min(1);

export default videoIdSchema;
import amqp from 'amqplib';

const RABBITMQ_URL = 'amqp://guest:guest@rabbitmq:5672';

export async function connectRabbitMQ() {
  const connection = await amqp.connect(RABBITMQ_URL);
  const channel = await connection.createChannel();
  return { connection, channel };
}

export async function sendTranscodeJob(channel: amqp.Channel, message: any) {
  const queue = 'transcode_queue';
  await channel.assertQueue(queue, { durable: true });
  channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), { persistent: true });
}

"use server";

import { redirect } from "next/navigation";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { createId } from "@paralleldrive/cuid2";
import { getCurrentSession } from "auth/session";
import { env } from "env";
import { s3Client } from "storage";

interface SuccessResponse {
  success: true;
  url: string;
  filename: string;
}

interface ErrorResponse {
  success: false;
  error: string;
}

export async function uploadFile(
  formData: FormData,
): Promise<SuccessResponse | ErrorResponse> {
  try {
    const session = await getCurrentSession();
    if (!session?.user) {
      redirect("/signin");
    }

    const file = formData.get("file") as File | undefined;

    if (!file) {
      throw new Error("No file provided");
    }

    // Generate unique filename
    const fileExtension = file.name.split(".").pop();
    const filename = `${createId()}.${fileExtension}`;

    // Convert File to Buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    await s3Client.send(
      new PutObjectCommand({
        Bucket: "editor",
        Key: filename,
        Body: buffer,
        ContentType: file.type,
        ACL: "public-read",
      }),
    );

    // Return public URL
    // Adjust this URL format according to your MinIO/S3 setup
    const publicUrl = `${env.MINIO_URL}/editor/${filename}`;

    return {
      success: true,
      url: publicUrl,
      filename,
    };
  } catch (error) {
    console.error("File upload error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to upload file",
    };
  }
}

import { BatchEmailSender } from "./batchEmailSender";
import { UserData } from "../mysql/mysqlClientProvider";
import { NewsletterData } from "..";

/**
 * The maximum number of emails that can be sent in a single batch.
 */
const BATCH_SIZE = 500;

type BatchResponse = {
  ErrorCode: number,
  Message: string,
  MessageID: string,
  SubmittedAt: string,
  To: string
}

// THIS WILL NEED TO BE CHANGED TO MATCH YOUR OWN POSTMARK TEMPLATE
type PostmarkTemplateModel = {
	authorName: string,
  emailFrom: string,
  created_at: string,
  website_url: string,
  header_image: string,
  newsletter_uuid: string,
  user_uuid: string,
  title: string,
  html: string,
  excerpt: string,
  feature_image: string,
	newsletterName: string,
	authorImage: string,
	username: string,
  user_email: string,
	postUrl: string
}


/**
 * A class that implements the `BatchEmailSender` interface using the Postmark email service.
 * This class can be used to send batches of emails using the Postmark API.
 */
export default class PostmarkBatchEmailSender implements BatchEmailSender {
  // ...
  pmClient: any;

  constructor(apiKey: string) {
    // import the postmark client
      let postmark = require("postmark");
      this.pmClient = new postmark.ServerClient(
        apiKey
      );
  }

  /**
   * Sends a batch of emails to the specified users using the provided newsletter data.
   * Returns an array of email addresses that failed to send.
   * @param userData An array of user data objects containing the email addresses and names of the recipients.
   * @param newsletter An object containing the data for the newsletter being sent.
   * @returns An array of email addresses that failed to send.
   */
  send(
    userData: UserData[],
    newsletter: NewsletterData
  ): string[] {
    let failedEmails: string[] = [];
    const emailFrom = process.env.MAIL_FROM;
    const templateId = process.env.MAIL_TEMPLATE_ID;
    const postUrl = process.env.GHOST_URL + '/' + newsletter.postSlug;
    
    const batches = Math.ceil(userData.length / BATCH_SIZE);
    
    for (let i = 0; i < batches; i++) {
      const batch = userData.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);
      const emailBatch = batch.map((user) => {
        const model: PostmarkTemplateModel = {
            username: user.name,
            emailFrom: emailFrom || "",
            website_url: process.env.GHOST_URL || "https://example.com",
            header_image: newsletter.header_image,
            user_email: user.email,
            user_uuid: user.uuid,
            created_at: newsletter.created_at,
            newsletter_uuid: newsletter.uuid,
            newsletterName: newsletter.name,
            title: newsletter.title,
            excerpt: newsletter.excerpt,
            html: newsletter.html,
            feature_image: newsletter.feature_image,
            authorName: newsletter.author.name,
            authorImage: newsletter.author.image,
            postUrl: newsletter.url,
        }
        
        return {
          From: emailFrom,
          To: user.email,
          TemplateId: templateId,
          TemplateModel: model,
        };
      });

      this.pmClient
        .sendEmailBatchWithTemplates(emailBatch)
        .then((response: BatchResponse[]) => {
          response.forEach((result: BatchResponse) => {
            if (result.Message !== "OK" || result.ErrorCode !== 0) {
              failedEmails.push(result.To);
            }
          });
        });
    }

    return failedEmails;
  }
}
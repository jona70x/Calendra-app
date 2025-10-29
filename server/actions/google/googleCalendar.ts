// functions that communicate with google api

"use server";

import { clerkClient } from "@clerk/nextjs/server";
import { google } from "googleapis";

async function getOathClient(clerkUserId: string) {
  try {
    // init clerk client

    const client = await clerkClient();

    // fetch Oauth access token for the given clerk user ID
    const { data } = await client.users.getUserOauthAccessToken(
      clerkUserId,
      "google"
    );

    // check if data is empry or the token is missing, throw an error
    if (data.length === 0 || !data[0].token) {
      throw new Error("No Oath data or token found for the user.");
    }

    // init Oath2 client with google credentials

    const oAuthClient = new google.auth.OAuth2(
      process.env.GOOGLE_OAUTH_CLIENT_ID,
      process.env.GOOGLE_OAUTH_CLIENT_SECRET,
      process.env.GOOGLE_OAUTH_REDIRECT_URL
    );

    // setting credentials with the obtained access token
    oAuthClient.setCredentials({ access_token: data[0].token });

    return oAuthClient;
  } catch (error: any) {
    throw new Error(`Failed to get OAuth client: ${error.message}`);
  }
}

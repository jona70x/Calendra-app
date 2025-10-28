import { neon } from "@neondatabase/serverless";
import {drizzle} from "drizzle-orm/neon-http"
import * from "./schema"
// Initialize the neon client using our neon database
const sql = neon(process.env.DATABASE_URL!);

export const db = drizzle(sql, { schema });

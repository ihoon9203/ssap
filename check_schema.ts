import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .limit(1);

    if (error) {
        console.error("Error fetching profiles:", error);
    } else {
        console.log("Profiles table columns:", data && data.length > 0 ? Object.keys(data[0]) : "No data found");
        console.log("Sample row:", data);
    }
}

checkSchema();

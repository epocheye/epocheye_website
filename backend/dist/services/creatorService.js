"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toPublicProfile = toPublicProfile;
exports.findCreatorByEmail = findCreatorByEmail;
exports.findCreatorById = findCreatorById;
exports.createCreator = createCreator;
exports.updateCreator = updateCreator;
exports.listAllCreators = listAllCreators;
const supabase_1 = require("../lib/supabase");
function toPublicProfile(c) {
    return {
        id: c.id,
        name: c.name,
        email: c.email,
        instagram_url: c.instagram_url,
        youtube_url: c.youtube_url,
        tiktok_url: c.tiktok_url,
        twitter_url: c.twitter_url,
        niche: c.niche,
        commission_rate: Number(c.commission_rate),
        customer_discount: Number(c.customer_discount),
        upi_id: c.upi_id,
        status: c.status,
        created_at: c.created_at,
    };
}
async function findCreatorByEmail(email) {
    const { data, error } = await supabase_1.supabase
        .from("creators")
        .select("*")
        .eq("email", email.toLowerCase())
        .single();
    if (error || !data)
        return null;
    return data;
}
async function findCreatorById(id) {
    const { data, error } = await supabase_1.supabase
        .from("creators")
        .select("*")
        .eq("id", id)
        .single();
    if (error || !data)
        return null;
    return data;
}
async function createCreator(params) {
    const { data, error } = await supabase_1.supabase
        .from("creators")
        .insert({
        name: params.name,
        email: params.email.toLowerCase(),
        password_hash: params.passwordHash,
        instagram_url: params.instagramUrl ?? null,
        youtube_url: params.youtubeUrl ?? null,
        tiktok_url: params.tiktokUrl ?? null,
        twitter_url: params.twitterUrl ?? null,
        niche: params.niche ?? null,
    })
        .select()
        .single();
    if (error || !data)
        throw new Error(error?.message ?? "Failed to create creator");
    return data;
}
async function updateCreator(id, fields) {
    const { data, error } = await supabase_1.supabase
        .from("creators")
        .update(fields)
        .eq("id", id)
        .select()
        .single();
    if (error || !data)
        throw new Error(error?.message ?? "Failed to update creator");
    return data;
}
async function listAllCreators() {
    const { data, error } = await supabase_1.supabase
        .from("creators")
        .select("*")
        .order("created_at", { ascending: false });
    if (error)
        throw new Error(error.message);
    return (data ?? []);
}
//# sourceMappingURL=creatorService.js.map
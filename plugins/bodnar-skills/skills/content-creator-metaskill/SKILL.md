---
name: content-creator-metaskill
description: Complete content creator toolkit covering idea to distribution. Routes to twelve sub-skills for short-form video scripts (Reels, TikTok, Shorts, Douyin), YouTube clipping with bilingual subtitles, YouTube thumbnail design, Instagram-native content (feed, stories, reels, carousels), TikTok strategy, multi-platform social posts (LinkedIn, Facebook, Instagram, Reddit), viral hook generation, multi-platform ad copy with A/B variants, long-form blog posts with SEO, newsletter curation, and platform-specific image sizing with executable resize scripts. Use this skill whenever the user mentions content creation, social media, video scripts, Instagram, TikTok, YouTube, Reels, Shorts, blog posts, newsletters, ad copy, viral hooks, thumbnails, captions, hashtags, audience growth, or any aspect of producing or distributing creator content, even without naming a platform. Pick the right sub-skill, or compose several when the request spans multiple stages.
---

# Content Creator Metaskill

A unified entry point for content creator workflows. Twelve sub-skills cover idea, script, capture, edit, package, caption, publish, and repurpose. The skill below is a router. Read the matching sub-skill file from `references/` once you know the job, then follow its instructions.

## How to use this skill

1. Identify which stage of the pipeline the user is in: idea, script, capture, edit, asset, caption, publish, or repurpose.
2. Pick the matching sub-skill from the routing table below.
3. Read `references/<sub-skill>/sub-skill.md` for that sub-skill's full instructions, plus any of its own `references/`, `scripts/`, `assets/`, or `templates/` as the sub-skill directs.
4. If a job spans multiple stages, compose sub-skills in pipeline order and read each one in turn.

## Routing table

Pick by intent. When two sub-skills could plausibly serve the same request, prefer the more specific one.

| User wants to | Read |
|---|---|
| Frame an angle, plan a content arc, or set up a creator persona | `references/persona-content-creator/sub-skill.md` |
| Write a 30-second to 3-minute video script for Reels, TikTok, Shorts, Douyin, or Xiaohongshu | `references/jackyshen-gen-short-video-script/sub-skill.md` |
| Sharpen the opening hook of any post, video, or thread | `references/viral-hook-creator/sub-skill.md` |
| Clip a long YouTube video into shareable segments with bilingual subtitles | `references/youtube-clipper/sub-skill.md` |
| Design a YouTube thumbnail with CTR optimization and safe-zone rules | `references/youtube-thumbnail-design/sub-skill.md` |
| Validate or resize an image against platform specs (Instagram, Facebook, X, LinkedIn, TikTok, YouTube, Pinterest, Snapchat, Threads) | `references/social-media-image-sizes/sub-skill.md` |
| Generate Instagram-native content (feed posts, stories, reels covers, carousels, quote graphics) | `references/instagram-content-generation/sub-skill.md` |
| Plan TikTok content strategy, video workflows, posting cadence, or analytics | `references/tiktok-marketing/sub-skill.md` |
| Draft platform-specific posts for LinkedIn, Facebook, Instagram, or Reddit, including from existing content | `references/social-media-posts/sub-skill.md` |
| Write multi-platform ad copy with A/B variants for Google, Meta, TikTok, or LinkedIn | `references/ads-copywriter/sub-skill.md` |
| Write a long-form blog post, tutorial, or thought-leadership article with SEO and a cover image | `references/blog-post/sub-skill.md` |
| Curate a newsletter with sourcing, editorial structure, link roundups, and growth strategy | `references/newsletter-curation/sub-skill.md` |

## When the request spans multiple stages

These compositions cover the most common content creator flows. Read the listed sub-skills in order and apply each one to its stage.

**Idea to short-form video to publish.** persona-content-creator (frame the angle), jackyshen-gen-short-video-script (write the script), viral-hook-creator (sharpen the cold open), social-media-image-sizes (size the cover or still), then social-media-posts plus instagram-content-generation or tiktok-marketing for the platform-native caption.

**Long-form YouTube to shorts pipeline.** youtube-clipper to slice the source video into segments, youtube-thumbnail-design for each clip's thumbnail, social-media-image-sizes to validate dimensions, and social-media-posts to draft the captions for each downstream platform.

**Repurpose a video into evergreen written content.** persona-content-creator to set the angle, blog-post to expand the script into an article, newsletter-curation to feature it in the next issue with surrounding context, ads-copywriter if any of it goes paid.

**One asset across many platforms.** social-media-posts as the planning surface, then instagram-content-generation, tiktok-marketing, and any platform-specific tightening, with social-media-image-sizes validating each output asset before publish.

## Why a meta-skill instead of twelve separate skills

Each sub-skill has a narrow job and its own bundled resources. Keeping them under one roof matters because creator work almost always spans several stages, and the user rarely names every sub-skill upfront. The router lets a request like "help me turn this video idea into a TikTok and a LinkedIn post" land on the right combination without the user shopping for skills one at a time.

## Sub-skill summaries

The single source of truth for each sub-skill is its own `sub-skill.md` file. The summaries below help with routing only and are not a substitute for reading the file when the sub-skill is selected.

**persona-content-creator** sets up a content creator persona that plans, drafts, and distributes across formats. Originally part of Google Workspace's official skills collection.

**jackyshen-gen-short-video-script** generates 30-second to 3-minute scripts for Reels, TikTok, Shorts, Douyin, Xiaohongshu, and WeChat Channels with cold open, payoff, and CTA structure.

**youtube-clipper** runs a six-stage workflow: download the YouTube video and subtitles, AI-driven chapter analysis, user clip selection, auto-edit, bilingual subtitle translation, burn-in, and summary text generation. The `sub-skill.md` is in Chinese, but the underlying yt-dlp, ffmpeg, and Whisper pipeline works on any source language.

**youtube-thumbnail-design** covers thumbnail dimensions, contrast and safe-zone rules, mobile preview optimization, face-expression psychology, and A/B testing.

**social-media-image-sizes** ships executable Node scripts at `references/social-media-image-sizes/scripts/check.js` and `resize.js` that validate any image against platform specs and resize to a correct copy. The `references/` subfolder holds per-platform spec sheets.

**social-media-posts** drafts platform-native posts for LinkedIn, Facebook, Instagram, and Reddit with character limits, hashtag strategies, hook placement, and image specs. Works from scratch, from existing content, or as a multi-platform campaign.

**instagram-content-generation** produces Instagram feed posts, stories, reels covers, carousels, quote graphics, and brand visuals using each::sense AI patterns optimized for Instagram engagement.

**tiktok-marketing** is a content strategy and workflow skill built around n8n automation templates. Use when the goal is an automated content pipeline rather than a one-off post.

**viral-hook-creator** generates attention-grabbing openings using documented psychological patterns and trigger words. Slot into any pipeline that produces hook-led content.

**ads-copywriter** generates multi-platform ad copy with A/B variants for Google Ads, Meta, TikTok, and LinkedIn. Useful even for organic content because the same constraint-driven thinking sharpens captions.

**blog-post** writes long-form articles with SEO optimization, structured outlines, and cover images. From the LangChain deep-agents reference set.

**newsletter-curation** covers content sourcing, editorial structure, link roundups, commentary style, sending cadence, and subscriber growth.

## Provenance

All twelve sub-skills are sourced from the public skills.sh registry, installed via Vercel Labs' `npx skills` CLI. Their original sources, internal paths, and SHA-256 content hashes are recorded in the `skills-lock.json` that ships alongside this skill in the project bundle.

## Workflow notes for sub-skills with bundled resources

Some sub-skills include scripts, references, assets, or templates beyond their `sub-skill.md`. When routing to one of these, also surface the bundled paths so they actually get used.

- **social-media-image-sizes** has runnable Node scripts. After reading its `sub-skill.md`, run `node references/social-media-image-sizes/scripts/check.js <image>` or `node references/social-media-image-sizes/scripts/resize.js <image> <platform>`.
- **youtube-clipper** has its own `scripts/` and `templates/` directories with the implementation. Follow `references/youtube-clipper/sub-skill.md` to use them.
- **viral-hook-creator** has its own `references/` with hook taxonomies. Read those when generating hooks.
- **instagram-content-generation** has its own `references/` with format-specific guidance.

## Renamed inner files

Each sub-skill's original `SKILL.md` was renamed to `sub-skill.md` inside this meta-skill. This avoids loader collisions where a skills CLI might otherwise try to register the inner files as separate top-level skills. The content is unchanged.

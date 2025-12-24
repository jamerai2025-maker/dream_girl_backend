



#!/usr/bin/env python3
"""
NSFW Image Generator API - Complete with ALL Prompts Included
"""
import os
os.environ['HF_HUB_ENABLE_HF_TRANSFER'] = '0'

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List
import torch
import base64
from io import BytesIO
from diffusers import StableDiffusionXLPipeline, StableDiffusionXLImg2ImgPipeline, DPMSolverMultistepScheduler
from PIL import Image, ImageEnhance, ImageFilter
import time
import re

# ============================================
# FASTAPI APP
# ============================================
app = FastAPI(
    title="NSFW Image Generator API",
    version="4.0.0",
    description="Complete with 150+ poses, 27 occupations, and full ID mapping"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================
# CONFIGURATION
# ============================================
MODEL_PATH = "/workspace/cyberrealistic_pony.safetensors"

QUALITY_PRESETS = {
    "standard": {
        "base_width": 832,
        "base_height": 1216,
        "steps": 35,
        "cfg": 5.0,
        "highres_scale": 1.5,
        "highres_steps": 25,
        "highres_denoise": 0.45,
    },
    "hd": {
        "base_width": 896,
        "base_height": 1344,
        "steps": 40,
        "cfg": 5.0,
        "highres_scale": 1.5,
        "highres_steps": 30,
        "highres_denoise": 0.5,
    },
    "ultra_hd": {
        "base_width": 1024,
        "base_height": 1536,
        "steps": 50,
        "cfg": 5.5,
        "highres_scale": 1.5,
        "highres_steps": 35,
        "highres_denoise": 0.5,
    },
    "extreme": {
        "base_width": 1152,
        "base_height": 1728,
        "steps": 60,
        "cfg": 5.5,
        "highres_scale": 1.5,
        "highres_steps": 40,
        "highres_denoise": 0.55,
    }
}

# ============================================
# POSE ID MAPPINGS
# ============================================
POSE_ID_MAP = {
    "693dbf7e31bf0f5e9dee5582": "doggy_style",
    "693dbf7e31bf0f5e9dee5583": "missionary",
    "693dbf7e31bf0f5e9dee5584": "cowgirl",
    "693dbf7e31bf0f5e9dee5585": "reverse_cowgirl",
    "693dbf7e31bf0f5e9dee5586": "mating_press",
    # Add more mappings as needed
}

# ============================================
# OCCUPATION ID MAPPINGS
# ============================================
OCCUPATION_ID_MAP = {
    "693dbf7e31bf0f5e9dee5505": "Doctor",
    "693dbf7e31bf0f5e9dee5506": "Teacher",
    "693dbf7e31bf0f5e9dee5507": "Artist",
    "693dbf7e31bf0f5e9dee5508": "Chef",
    "693dbf7e31bf0f5e9dee5509": "Stripper",
    # Add more mappings
}

# ============================================
# ALL 27 OCCUPATIONS WITH SETTINGS
# ============================================
OCCUPATION_SETTINGS = {
    "Custom": {"background": "custom setting", "props": "custom props", "lighting": "dramatic lighting"},
    "None": {"background": "bedroom, luxury bed, silk sheets", "props": "soft pillows", "lighting": "warm golden hour lighting"},
    "Stripper": {"background": "strip club stage, pole, neon lights", "props": "stripper pole, stage lights", "lighting": "colorful neon, spotlight"},
    "Food Truck Owner": {"background": "food truck, street setting", "props": "food truck, cooking equipment", "lighting": "outdoor natural light"},
    "Doctor": {"background": "medical office, examination room", "props": "medical equipment, examination table", "lighting": "clinical bright lighting"},
    "Superhero": {"background": "city skyline, rooftop", "props": "cape, mask", "lighting": "dramatic heroic lighting"},
    "Professional Gamer": {"background": "gaming room, RGB lights, monitors", "props": "gaming chair, keyboard, headset", "lighting": "RGB lighting"},
    "Teacher": {"background": "classroom, blackboard, desk", "props": "desk, books, blackboard", "lighting": "bright classroom lighting"},
    "Artist": {"background": "art studio, paintings, canvas", "props": "canvas, brushes, paint", "lighting": "natural window light"},
    "Social Media Influencer": {"background": "aesthetic room, ring light", "props": "ring light, phone, camera", "lighting": "perfect ring light"},
    "Dating Coach": {"background": "cozy office, seating", "props": "couch, wine glasses", "lighting": "warm romantic lighting"},
    "Life Coach": {"background": "wellness office, plants", "props": "cozy seating, plants", "lighting": "warm natural light"},
    "Dominatrix": {"background": "dungeon, red lighting, BDSM equipment", "props": "whip, chains, restraints", "lighting": "dramatic red"},
    "Dungeon Master": {"background": "medieval dungeon, stone walls", "props": "chains, medieval equipment", "lighting": "torch lighting"},
    "Escort": {"background": "luxury hotel room, elegant bedroom", "props": "luxury bed, champagne", "lighting": "soft romantic"},
    "Warrior": {"background": "battlefield, castle, dramatic sky", "props": "sword, shield, armor", "lighting": "dramatic battle"},
    "Marine Biologist": {"background": "research facility, aquarium", "props": "microscope, aquarium tanks", "lighting": "blue aquatic"},
    "Lawyer": {"background": "law office, bookshelves", "props": "law books, desk, briefcase", "lighting": "professional office"},
    "Engineer": {"background": "workshop, blueprints", "props": "blueprints, tools, computer", "lighting": "bright workshop"},
    "Surfing Instructor": {"background": "beach, ocean waves, sunset", "props": "surfboard, beach towel", "lighting": "golden beach sunset"},
    "Chef": {"background": "professional kitchen", "props": "cooking tools, ingredients", "lighting": "bright kitchen"},
    "Porn Star": {"background": "professional studio, camera setup", "props": "camera, studio lights", "lighting": "professional studio"},
    "Skydiving Instructor": {"background": "airplane interior, sky view", "props": "parachute, goggles", "lighting": "bright daylight"},
    "Mage": {"background": "magical tower, mystical library", "props": "magic staff, spell books", "lighting": "magical glow"},
    "Musician": {"background": "music studio, stage", "props": "guitar, microphone", "lighting": "stage lights"},
    "Professional Dog": {"background": "dog training facility, park", "props": "leash, toys, training", "lighting": "natural outdoor"},
}

# ============================================
# GLOBAL MODELS
# ============================================
pipe = None
pipe_img2img = None

def load_models():
    global pipe, pipe_img2img
    
    if pipe is not None:
        return pipe, pipe_img2img
    
    print(f"\n🔥 Loading model: {MODEL_PATH}")
    
    pipe = StableDiffusionXLPipeline.from_single_file(
        MODEL_PATH,
        torch_dtype=torch.float16,
        use_safetensors=True,
    )
    
    pipe_img2img = StableDiffusionXLImg2ImgPipeline(
        vae=pipe.vae,
        text_encoder=pipe.text_encoder,
        text_encoder_2=pipe.text_encoder_2,
        tokenizer=pipe.tokenizer,
        tokenizer_2=pipe.tokenizer_2,
        unet=pipe.unet,
        scheduler=pipe.scheduler,
    )
    
    pipe.scheduler = DPMSolverMultistepScheduler.from_config(
        pipe.scheduler.config,
        use_karras_sigmas=True,
        algorithm_type="sde-dpmsolver++",
        solver_order=2
    )
    pipe_img2img.scheduler = pipe.scheduler
    
    pipe = pipe.to("cuda")
    pipe_img2img = pipe_img2img.to("cuda")
    
    pipe.enable_vae_slicing()
    pipe.enable_vae_tiling()
    pipe_img2img.enable_vae_slicing()
    pipe_img2img.enable_vae_tiling()
    
    try:
        pipe.enable_xformers_memory_efficient_attention()
        pipe_img2img.enable_xformers_memory_efficient_attention()
    except:
        pass
    
    print("✅ Model loaded!\n")
    return pipe, pipe_img2img

# ============================================
# PYDANTIC MODELS
# ============================================
class PersonalityData(BaseModel):
    poseId: Optional[str] = None
    occupationId: Optional[str] = None
    hobbyId: Optional[str] = None
    fetishId: Optional[str] = None
    relationshipId: Optional[str] = None

class PhysicalAttributes(BaseModel):
    ethnicity: Optional[str] = None
    eyeColor: Optional[str] = None
    hairStyle: Optional[str] = None
    breastSize: Optional[str] = None
    buttSize: Optional[str] = None

class CharacterData(BaseModel):
    name: str
    age: int
    gender: str
    description: str
    personalityId: Optional[PersonalityData] = None
    physicalAttributesId: Optional[PhysicalAttributes] = None
    
    # Flattened fields
    ethnicity: Optional[str] = None
    eyeColor: Optional[str] = None
    hairStyle: Optional[str] = None
    breastSize: Optional[str] = None
    buttSize: Optional[str] = None

class GenerateRequest(BaseModel):
    character: CharacterData
    pose_name: Optional[str] = None
    quality: Optional[str] = "ultra_hd"
    seed: Optional[int] = None
    use_highres: Optional[bool] = True
    enhance: Optional[bool] = True

class GenerateResponse(BaseModel):
    success: bool
    image_base64: Optional[str] = None
    character_name: str
    pose: str
    occupation: str
    quality: str
    resolution: str
    generation_time: str
    seed: int

# ============================================
# ALL 150+ PROMPTS (COMPLETE)
# ============================================
PROMPTS = {
    
    # ============================================
    # INTERCOURSE CATEGORY
    # ============================================
    "doggy_style": """score_9, score_8_up, score_7_up,
        1girl 1boy, explicit hardcore doggystyle sex from behind, on all fours position, side view angle,
        woman on hands and knees bent over forward on bed, deeply arched back spine curved, ass raised high hips tilted up presenting, head down face in pillow turned to side, eyes closed mouth open moaning in pleasure,
        stunningly beautiful woman, 24 years old, long blonde hair in high ponytail swaying with motion,
        gorgeous face showing pleasure, piercing blue eyes half-closed, parted lips moaning, flushed cheeks,
        large perky natural breasts hanging down swaying with motion, nipples erect pointing down, athletic toned body, flat stomach visible abs, narrow waist, wide hips, thick toned thighs, round firm bubble butt prominent jiggling, ass cheeks spread apart,
        flawless smooth tan skin, sweaty glistening body, realistic detailed skin texture with visible pores, light sweat droplets,
        pussy visible from behind stretched around thick penis, labia lips gripping shaft, pink inner folds visible, wetness glistening, vaginal fluids dripping, deep balls-deep penetration visible,
        muscular athletic man kneeling behind her between legs, strong hands firmly gripping her hips, fingers digging into soft flesh, defined arms flexed, broad shoulders, visible abs, full body visible,
        thick erect penis shaft penetrating deeply into pussy, veins prominent on cock, balls hanging visible pressed against pussy,
        intense rhythmic powerful thrusting motion, ass rippling and jiggling from impact, skin slapping sounds implied, bodies moving together,
        hands gripping white silk sheets tightly, fingers clenched, overwhelmed with pleasure expression,
        luxury master bedroom setting, king size bed with silk sheets, warm golden ambient lighting from window, intimate atmosphere, full body shot composition,
        photorealistic, photograph, 8K UHD resolution, hyperrealistic, RAW photo quality, ultra detailed skin texture, professional photography, cinematic dramatic lighting, shallow depth of field""",
    
    "missionary": """score_9, score_8_up, score_7_up,
        1girl 1boy, explicit hardcore missionary position sex, face to face intimate, full body view,
        woman lying on back on bed, head on pillow, blonde hair spread out, legs spread wide apart bent at knees, thighs open inviting, feet flat on bed or ankles crossed behind man's back,
        beautiful woman, 25 years old, long flowing blonde hair fanned out on pillow,
        gorgeous face looking up with intense eye contact, bright blue eyes locked with partner, mouth open moaning, lips parted, face flushed with pleasure and arousal,
        large perky breasts visible from front, nipples erect hard standing up, natural breast shape, cleavage prominent, flat toned stomach, narrow waist, wide hips,
        smooth fair skin, light sweat glistening, realistic skin texture with pores visible, flushed pink skin tone,
        pussy visible between spread legs stretched around thick penetrating penis, labia lips gripping shaft tightly, vaginal opening visible, wetness glistening, deep penetration visible,
        athletic muscular man positioned on top between her legs, arms supporting body weight on either side, biceps flexed, broad chest, defined abs visible, hips between thighs,
        thick erect penis shaft penetrating deeply into pussy, veins prominent, balls pressed against ass, pubic areas touching,
        rhythmic thrusting motion, bodies moving together synchronized, intimate face-to-face position, passionate kissing implied,
        legs wrapped around waist pulling him closer, hands on his back or shoulders,
        luxury bedroom, silk sheets underneath, soft romantic lighting, golden glow, intimate atmosphere, full body composition,
        photorealistic, 8K UHD, hyperrealistic, RAW photo, professional photography, romantic soft lighting, detailed, masterpiece quality""",
    
    "cowgirl": """score_9, score_8_up, score_7_up,
        1girl 1boy, explicit hardcore cowgirl riding position, woman on top, full body view,
        woman straddling on top riding, sitting on hips, knees planted wide on bed either side, legs spread, athletic toned thighs flexed from squatting,
        stunning woman, 26 years old, long blonde hair in high ponytail whipping around, hair flowing with motion,
        beautiful face tilted back, blue eyes closed or looking down, mouth open moaning loudly, expression of intense pleasure, flushed cheeks,
        large perky breasts bouncing up and down wildly with riding motion, nipples erect hard, breast movement captured, athletic slim body, flat toned stomach abs visible, narrow waist, wide hips, round bubble butt,
        tan smooth skin, sweaty glistening, realistic skin texture, flushed pink from exertion,
        pussy stretched around thick penis gripping shaft, labia lips wrapped around cock, vaginal opening visible, wetness coating shaft, deep penetration balls pressed against ass,
        hands planted on man's chest pushing down for leverage, fingers spread on pecs, arms straight locked,
        muscular man lying on back underneath, hands gripping her hips guiding motion, fingers digging into soft flesh, defined chest and abs visible, legs spread on bed,
        thick erect penis visible between legs penetrating upward, veins prominent, balls visible below, shaft covered in fluids,
        powerful rhythmic bouncing motion up and down, ass slapping on thighs, riding cock, grinding hips circular motion,
        dominant woman on top taking control, empowered expression,
        bedroom setting, rumpled sheets, warm lighting, full body shot,
        photorealistic, 8K UHD, hyperrealistic, RAW photo, detailed, dominant woman, masterpiece""",
    
    "reverse_cowgirl": """score_9, score_8_up, score_7_up,
        1girl 1boy, explicit hardcore reverse cowgirl riding position, woman facing away, rear view, full body,
        woman straddling on top facing away reverse position, back view towards camera, knees on bed legs spread, athletic toned legs, thick thighs flexed,
        beautiful woman, 25 years old, long blonde hair in ponytail cascading down back swaying with motion,
        back of head visible, face in profile looking over shoulder, blue eyes visible, mouth open moaning,
        athletic body from behind, narrow waist visible, spine curved, side profile of breasts visible bouncing,
        smooth tan skin, sweaty back glistening, realistic skin texture,
        round prominent bubble butt ass cheeks spread apart, asshole visible above penetration, pussy stretched around thick penis shaft from behind, labia lips gripping cock, vaginal opening visible stretched, wetness glistening on shaft,
        hands on man's thighs or knees for support, fingers gripping legs, arms reaching back,
        muscular man lying on back, legs spread flat, hands on her ass cheeks spreading them wider, fingers digging into soft flesh, or hands on hips guiding,
        thick erect penis visible from behind penetrating upward, shaft covered in fluids, veins prominent, balls hanging below visible,
        powerful bouncing motion up and down on cock, ass slapping down on thighs, pussy sliding up shaft then dropping, ass jiggling and rippling,
        reverse angle riding, looking back over shoulder,
        bedroom, silk sheets, dramatic lighting from side, full body rear view composition,
        photorealistic, 8K UHD, hyperrealistic, RAW photo, ass prominent, detailed, masterpiece""",
    
    "mating_press": """score_9, score_8_up, score_7_up,
        1girl 1boy, explicit hardcore mating press breeding position, legs pushed back, extreme penetration, full body,
        woman lying on back, head on pillow or hanging off edge, blonde hair spread out, eyes rolled back showing whites, mouth wide open moaning loudly, tongue out, ahegao expression,
        beautiful woman, 24 years old, long blonde hair messy and wild,
        gorgeous face showing overwhelming pleasure, blue eyes rolled back, mouth gaped, drool dripping, face extremely flushed,
        large breasts squeezed between thighs, nipples visible, athletic body compressed,
        fair skin extremely flushed red, profusely sweating, glistening wet,
        legs pushed back folded completely against chest and breasts, thighs pressed hard into breasts, knees near shoulders or behind head, feet pointing up or crossed behind own head, extremely flexible position,
        pussy fully exposed tilted upward, labia lips stretched maximally around thick penis, vaginal opening gaped, pink inner walls visible, cervix contact visible, wetness flooding, deep balls-deep maximum penetration,
        athletic muscular man on top leaning forward over her, full body weight pressed down, arms on either side or gripping behind knees pushing legs back further, broad shoulders, defined abs,
        thick penis buried completely inside pussy, only balls visible pressed against ass, shaft completely engulfed, maximum depth penetration,
        intense powerful downward pounding, pelvis grinding into pussy, brutal thrusting, breeding position, primal intensity,
        legs trembling, body convulsing, completely overwhelmed, ahegao face, uncontrollable orgasm,
        bedroom, sheets soaked, intense lighting, overhead angle view, full body composition,
        photorealistic, 8K UHD, hyperrealistic, extreme position, breeding, intense, masterpiece""",
    
    "standing_doggy": """score_9, score_8_up, score_7_up,
        1girl 1boy, standing doggy style, bent over, vertical sex, full body standing,
        woman bent forward standing, hands flat on wall or gripping furniture, ass pushed back, one leg slightly raised for angle, dress or skirt hiked up around waist,
        beautiful woman, 24 years old, blonde hair in messy ponytail falling apart from motion,
        gorgeous face against wall, cheek pressed to surface, blue eyes closed, mouth gasping open, expression of urgent pleasure,
        medium perky breasts, athletic slim body, tight narrow waist, round firm ass exposed, toned thighs, one leg lifted,
        fair smooth skin flushing pink, light sweat forming, goosebumps visible,
        pussy visible from behind, standing penetration, deep angle,
        muscular man standing behind, hands firmly gripping her hips, powerful stance, full body visible, fully clothed or pants down,
        thick erect penis penetrating from behind, standing sex position, balls visible,
        urgent fast standing thrusting, spontaneous passionate sex, quick hard movements, desperate fucking,
        legs shaking barely able to stand, clutching wall desperately, overwhelming standing pleasure,
        apartment hallway against wall, or office, or public restroom, coats nearby, keys dropped on floor, spontaneous setting, full body shot,
        photorealistic, 8K UHD, hyperrealistic, urgent desperate atmosphere, spontaneous encounter, realistic lighting, detailed""",
    
    "spooning_sex": """score_9, score_8_up, score_7_up,
        1girl 1boy, spooning sex position, lying on side, intimate close, side view full body,
        woman lying on side, body curved, top leg lifted or bent, bottom leg straight, relaxed comfortable position,
        beautiful woman, 27 years old, long brown hair loose flowing, natural waves,
        gorgeous face in profile, warm brown eyes half-closed, gentle smile mixed with pleasure, soft expression,
        medium natural breasts visible from side, soft feminine curves, gentle body, wide hips, soft round ass pressed back,
        smooth fair skin, light natural glow, soft body warmth visible,
        pussy visible from behind angle, gentle penetration, intimate connection,
        loving man spooning behind, body pressed close, chest against her back, arm wrapped around waist or holding breast gently, other arm under pillow, full body close,
        penis penetrating from behind, gentle angle, intimate position,
        slow gentle rocking motion, lazy morning sex, comfortable intimate grinding, bodies moving together slowly,
        soft moans, whispered intimacy, comfortable pleasure, cozy morning,
        cozy bedroom, soft bed, morning sunlight through curtains, golden glow, warm atmosphere, intimate side view composition,
        photorealistic, 8K UHD, hyperrealistic, soft romantic lighting, intimate cozy, detailed, masterpiece""",
    
    "pronebone": """score_9, score_8_up, score_7_up,
        1girl 1boy, pronebone position, lying flat, pressed down, side view full body,
        woman lying completely flat on stomach, face buried in pillow turned to side, ass slightly raised, arms above head or stretched out, legs together or slightly apart, body pinned flat,
        beautiful woman, 25 years old, long red hair in messy ponytail on pillow, hair fanned out,
        gorgeous flushed face pressed into pillow, green eyes unfocused glazed, mouth panting open, cute freckles on face,
        large soft breasts squished flat against bed, compressed, body curved, wide hips, plump round ass slightly raised,
        pale skin with freckles, flushed red, sweating, realistic detailed texture,
        pussy visible from behind angle, penetration from above, pinned position,
        man positioned on top from behind, full body weight pressing down, lying on top, pinning her down, hands on bed beside her or holding wrists, full body visible,
        penis penetrating from behind and above, deep grinding angle, full contact,
        deep grinding motion, intimate rubbing, slow powerful thrusts, body weight pressing, pinned helpless underneath,
        face pressed in pillow, muffled moans, clutching sheets desperately, completely pinned and dominated,
        cozy bedroom, soft mattress dented from weight, morning soft light, intimate close, side view composition,
        photorealistic, 8K UHD, hyperrealistic, detailed freckles, soft morning light, body weight pressure, intimate, masterpiece""",
    
    "full_nelson": """score_9, score_8_up, score_7_up,
        1girl 1boy, full nelson position, legs held up, arms locked, suspended, full body front view,
        woman suspended held up, arms locked behind neck by man's arms, legs spread wide held up by man's arms hooked under knees, completely exposed and helpless position, body lifted off ground or bed,
        stunning woman, 24 years old, blonde hair in high ponytail, hair wild from motion,
        gorgeous face looking forward, blue eyes wide showing whites, mouth gaped open, expression of overwhelming sensation, completely vulnerable,
        large breasts bouncing freely, exposed completely, athletic body on display, stomach visible, narrow waist,
        tan skin flushed, sweating profusely, glistening wet,
        legs spread maximally wide held up, thighs trembling, pussy fully exposed facing forward, labia stretched around penis, vaginal opening visible gaped, deep penetration from below,
        strong muscular man behind and under, arms locked under her arms hooking behind neck, full nelson hold, hands clasped behind her head, legs holding her thighs spread, powerful stance,
        thick penis penetrating upward from below, deep angle, balls visible,
        suspended bouncing motion, lifted and dropped on cock, controlled by his strength, helpless suspended fucking,
        completely at his mercy, unable to control motion, overwhelmed, submissive position, dominated,
        bedroom or gym setting, standing suspended position, dramatic lighting, full frontal view composition,
        photorealistic, 8K UHD, hyperrealistic, extreme position, strength display, dominated, detailed, masterpiece""",
    
    "anal": """score_9, score_8_up, score_7_up,
        1girl 1boy, explicit hardcore anal sex penetration, from behind, ass prominent, full body rear view,
        woman on hands and knees or lying on stomach, ass raised high presenting, back deeply arched, spine curved, ass cheeks spread wide apart naturally or hands reaching back spreading,
        beautiful woman, 25 years old, long brown hair in loose ponytail,
        gorgeous face looking back over shoulder, hazel eyes showing mixture of pain and pleasure, mouth open, intense expression, biting lip,
        medium perky breasts hanging or pressed down, athletic toned body, narrow waist, wide hips, round prominent bubble butt,
        smooth olive skin, sweaty glistening, realistic texture with pores,
        hands reaching back spreading own ass cheeks wide, fingers pulling flesh apart, asshole exposed visible stretched around thick penis shaft, tight anal ring gripping cock, pink inner anal walls visible, anus stretched maximum around girth,
        pussy visible below, vaginal opening visible unused, wetness or excessive lubrication glistening on shaft and around anus,
        athletic muscular man positioned behind kneeling between legs, hands gripping hips firmly or hands on ass cheeks spreading wider, defined body visible,
        thick erect penis shaft penetrating anus deeply, veins prominent on cock, shaft covered in lube glistening, balls hanging visible pressed against pussy below,
        slow controlled deep anal thrusting, careful rhythm, cock sliding in and out of tight asshole, anal ring stretching and contracting,
        intense expression, mixture of pain and pleasure, adjusting to penetration, anal tightness visible,
        bedroom setting, silk sheets, lubrication visible, dramatic side lighting, golden glow, rim lighting on curves, intimate intense atmosphere, close-up on anal penetration, full body rear view composition,
        photorealistic, 8K UHD, hyperrealistic, anal penetration detailed, tight anal ring, deep anal, realistic, masterpiece""",
    
    "standing_splits": """score_9, score_8_up, score_7_up,
        1girl 1boy, standing splits sex position, one leg raised high, flexible, vertical full body,
        woman standing on one leg, other leg held high in air, leg extended up vertically or at angle, extreme flexibility, splits position standing, body balanced,
        flexible woman, 25 years old, blonde hair in tight bun, athletic dancer body,
        gorgeous face showing concentration and pleasure, blue eyes focused, mouth open moaning, flexible expression,
        medium firm breasts, extremely athletic toned body, visible abs, dancer physique, narrow waist, wide hips, toned flexible legs, round firm ass,
        smooth tan skin, light sweat, muscles defined visible,
        one leg standing supporting full weight, thigh flexed, other leg raised high, thigh at face level, splits visible, pussy exposed from angle, penetration visible from standing splits,
        strong athletic man standing, holding her raised leg up supporting, hand under thigh or knee, other hand on waist stabilizing, full body visible, strong enough to support,
        penis penetrating upward into pussy, standing angle, deep penetration from vertical position,
        standing thrusting motion, balancing act, careful movements, impressive flexibility display, acrobatic sex,
        focused on balance, impressive position, flexible achievement, showing off,
        bedroom or dance studio, mirrors possibly reflecting, dramatic lighting, side view capturing splits, full body composition showing flexibility,
        photorealistic, 8K UHD, hyperrealistic, extreme flexibility, athletic bodies, acrobatic position, detailed, masterpiece""",

    "against_wall": """score_9, score_8_up, score_7_up,
        1girl 1boy, sex against wall, standing pressed, vertical pinned, full body standing,
        woman pressed against wall, back flat on wall or facing wall hands on wall, legs spread or wrapped around waist, body pinned, dress hiked up or clothes disheveled,
        beautiful woman, 24 years old, blonde hair messy from passion, strands in face,
        gorgeous face against wall or looking at partner, blue eyes intense, mouth open gasping, passionate expression, cheek may be pressed to wall,
        medium perky breasts pressed against wall or chest, athletic slim body, narrow waist, toned legs wrapped around or spread standing, round ass pressed or exposed,
        fair skin flushed, sweating, pressed flat,
        legs wrapped around his waist holding tight, ankles crossed behind back, or standing on tiptoes spread, pussy penetrated, lifted slightly off ground or standing,
        strong muscular man pressing her into wall, hands under her thighs lifting, or hands on wall beside her, chest pressed close, powerful stance, full body visible,
        thick penis penetrating, vertical angle, deep thrusts against wall,
        urgent hard thrusting against wall, pinned and fucked, fast passionate motion, body pressed flat, wall sex intensity,
        desperate passionate, urgent need, spontaneous lust, intense coupling,
        apartment hallway, bedroom wall, or bathroom, urgent setting, harsh overhead lighting or dramatic shadows, full body vertical composition,
        photorealistic, 8K UHD, hyperrealistic, pressed against wall, urgent desperate, vertical sex, detailed, masterpiece""",

    "seated_straddle": """score_9, score_8_up, score_7_up,
        1girl 1boy, seated straddle sex position, sitting on lap face to face, intimate close, full body,
        woman sitting straddling man's lap, legs spread around his waist, knees on surface beside hips, arms around neck or shoulders, bodies pressed close face to face,
        beautiful woman, 26 years old, long brown hair loose flowing down back, natural waves,
        gorgeous face close to his, brown eyes gazing with passion, nose touching, lips close, intimate eye contact, soft expression mixing love and pleasure,
        medium natural breasts pressed against his chest, soft feminine body, gentle curves, narrow waist, wide hips, round soft ass on lap,
        smooth fair skin, natural glow, warmth visible between bodies,
        sitting straddling position, pussy stretched around penis, intimate connection visible, close grinding,
        loving man sitting, legs spread or crossed supporting, arms wrapped around her waist pulling close, hands on lower back or ass, chest to chest contact, full body close together,
        penis penetrating upward into pussy, intimate deep angle, close connection,
        slow intimate grinding rocking motion, hips rolling, circular movements, close body contact, synchronized rhythm, passionate kissing, deep intimacy,
        soft moans shared between kisses, whispered words, emotional connection visible, love and lust combined, intimate passion,
        comfortable bedroom, soft chair or bed edge, cozy setting, warm romantic lighting, soft golden glow, intimate close-up composition,
        photorealistic, 8K UHD, hyperrealistic, romantic intimate, emotional connection, passionate, soft lighting, detailed, masterpiece""",

    "plowcam": """score_9, score_8_up, score_7_up,
        1girl 1boy, plow position, legs over shoulders, deep penetration, POV angle view,
        woman lying on back, legs pushed up over shoulders, feet by man's head or on shoulders, thighs against chest, knees near face, flexible position, fully exposed,
        beautiful woman, 24 years old, blonde hair spread on pillow, messy from motion,
        gorgeous face looking up, blue eyes making eye contact with POV, mouth open moaning, eye contact intense, looking directly forward,
        large perky breasts visible between legs, nipples erect, athletic body visible, narrow waist between thighs,
        smooth tan skin, sweaty glistening, flushed pink,
        legs pushed up high resting on shoulders, thighs framing view, pussy fully visible exposed, labia stretched around penetrating penis, vaginal opening visible, deep penetration from high angle, balls visible slapping,
        POV perspective from man's view, looking down at her between her legs, arms visible on either side or holding legs, POV angle,
        thick penis visible penetrating downward, POV perspective, shaft visible entering pussy, deep angle,
        downward pounding thrusting, deep penetration from high angle, powerful motion, plow driving deep,
        eye contact maintained, looking up at camera, direct gaze, submissive position receiving,
        bedroom, bed view from above, POV perspective lighting, dramatic angle, POV composition,
        photorealistic, 8K UHD, hyperrealistic, POV angle, legs over shoulders, eye contact, detailed, masterpiece""",

    
    # ============================================
    # ORAL CATEGORY
    # ============================================
    "blowjob": """score_9, score_8_up, score_7_up,
        1girl 1boy, explicit hardcore blowjob oral sex, fellatio, cock in mouth, kneeling, full body kneeling view,
        woman kneeling on floor or bed, knees together or apart, athletic toned legs, feet visible behind, body leaning forward, back straight or slightly arched,
        stunning woman, 25 years old, blonde hair in high ponytail or loose falling around face,
        gorgeous face at crotch level, piercing blue eyes looking up maintaining eye contact, mouth wide open lips wrapped around thick erect penis, cheeks hollowing from suction, expression focused and seductive,
        large breasts hanging down or pressed against legs, nipples visible erect, cleavage prominent, athletic slim body, narrow waist visible from side,
        smooth tan skin, realistic detailed texture with pores, light sweat,
        hands on man's thighs for support or gripping base of penis shaft stroking, one hand cupping balls gently massaging, fingers wrapped around shaft,
        head positioned at crotch, mouth stretched around thick cock, shaft disappearing between lips, tongue visible licking underside or swirling around tip, saliva dripping from mouth coating penis, spit strings connecting mouth to cock, drool running down chin onto breasts, lips stretched around girth,
        muscular athletic man standing or sitting, legs spread, powerful thighs, feet flat, hands on her head guiding motion or fingers tangled in hair gripping ponytail, or hands relaxed at sides, full body visible,
        thick erect penis shaft visible entering mouth, veins prominent bulging on cock, cock head inside mouth, balls hanging below near chin, pubic hair trimmed visible,
        rhythmic head bobbing up and down on cock, lips sliding up shaft to tip then down to base, sucking motion, intense oral pleasure,
        looking up with seductive gaze, eye contact during blowjob, passionate fellatio, dedicated oral service,
        bedroom or living room setting, kneeling on floor or bed, soft side lighting creating dramatic shadows, golden glow, rim lighting on hair, intimate atmosphere, shallow depth of field, sharp focus on face and oral action, close-up composition,
        photorealistic, 8K UHD, hyperrealistic, RAW photo quality, detailed oral sex, saliva visible, intimate, masterpiece""",
    
    "deepthroat": """score_9, score_8_up, score_7_up,
        1girl 1boy, explicit hardcore deepthroat oral sex, deep throat, extreme oral, throat penetration, full body or close-up,
        woman kneeling on floor or lying on back with head hanging completely off edge of bed, neck extended straight horizontal, throat forming straight line with mouth for maximum depth, throat aligned,
        beautiful woman, 24 years old, blonde hair in ponytail on floor or hanging down from bed edge,
        gorgeous face at crotch level, jaw stretched open maximally wide, mouth gaping, lips wrapped around base of thick penis shaft completely, entire cock length buried inside mouth and down throat, shaft disappeared, nose pressed flush against pubic area touching balls and pubic hair, face pressed into pelvis,
        throat visibly bulging stretched around cock girth, neck distended showing outline of penis inside, throat stretched maximum, large breasts visible hanging or from side,
        flushed skin, extremely flushed face bright red,
        eyes watering heavily tears streaming down cheeks, mascara running black streaks, eye makeup ruined smeared, eyes rolled back showing whites or squeezed shut tightly,
        hands on man's thighs gripping tightly or hands on ass pulling him deeper or wrists restrained behind back, body tense,
        saliva flooding excessively, drool pouring from mouth around cock base, spit flowing down face and chin, pooling if lying down, face completely wet,
        athletic muscular man standing over or lying with her head between legs, legs spread wide, powerful thighs, hands on her head controlling, fingers tangled in hair gripping skull firmly, or hands on own hips, full body visible,
        thick erect penis completely engulfed buried in throat to hilt, balls pressed against face, testicles covering nose, pubic hair against face, shaft completely inside,
        holding cock deep inside throat, gagging reflex suppressed, throat convulsing, swallowing around shaft, holding breath, then slowly withdrawing for air,
        catching breath desperately, gasping for air when cock withdraws, coughing gagging, completely overwhelmed, submissive deepthroat,
        bedroom or living room, dramatic intense lighting, harsh shadows, close-up on throat bulge and face, extreme detail,
        photorealistic, 8K UHD, hyperrealistic, throat bulge visible, extreme oral, saliva tears, intense, masterpiece""",
    
    "face_fuck": """score_9, score_8_up, score_7_up,
        1girl 1boy, explicit hardcore face fucking, rough aggressive oral, throat pounding, dominant, close-up,
        woman kneeling or sitting, head held in place by hands, unable to pull away, mouth open being used, helpless position,
        beautiful woman, 23 years old, blonde hair in ponytail gripped tightly, hair pulled,
        gorgeous face being fucked, blue eyes watering heavily, tears streaming, mascara ruined, mouth stretched wide gaped, jaw aching, expression showing intensity, overwhelmed,
        large breasts bouncing from motion, body being pushed back and forth,
        fair skin extremely flushed red, sweating, saliva everywhere,
        hands gripping his thighs desperately for stability or hands restrained, completely at his mercy,
        mouth penetrated aggressively, throat being fucked, saliva flying everywhere, spit excessive, drool pouring, gagging sounds implied,
        aggressive dominant man standing, legs spread powerfully, both hands gripping her head firmly, fingers tangled deep in hair, holding skull, controlling completely,
        thick penis aggressively thrusting into mouth and throat, rough face fucking motion, hips driving forward,
        aggressive powerful thrusting into mouth, brutal face fucking, rough oral use, dominant pounding her throat, no mercy,
        head held still forced to take it, completely dominated, rough usage, intense face fucking, aggressive oral,
        bedroom or living room, harsh dramatic lighting, shadows aggressive, close-up intense focus, aggressive atmosphere,
        photorealistic, 8K UHD, hyperrealistic, rough aggressive, intense domination, saliva tears, brutal, masterpiece""",
    
    "titfuck": """score_9, score_8_up, score_7_up,
        1girl 1boy, titfuck, paizuri, breast sex, penis between breasts, tit fucking, close-up upper body,
        woman kneeling or sitting, upper body leaning forward, large breasts pushed together squeezing penis between cleavage, hands pressing breasts together from sides,
        stunning woman, 26 years old, blonde hair loose flowing or in ponytail,
        gorgeous face looking down at cleavage or up at man, blue eyes seductive gaze, mouth slightly open, tongue out licking tip when it emerges, sensual expression,
        extremely large natural breasts, huge soft breasts squeezing shaft together, cleavage deep, nipples erect hard visible pointing inward, breast flesh soft and squeezing, ample cleavage engulfing cock,
        smooth fair skin, breasts glistening with oil or saliva for lubrication, realistic soft texture,
        hands pressing breasts together from outer sides, fingers digging into soft breast flesh, squeezing tightly, palms flat on breasts, creating tight channel,
        penis shaft buried between large soft breasts, cock sliding up and down in cleavage, cock head emerging from top of cleavage near face, tip appearing and disappearing, shaft completely engulfed in soft breast flesh,
        athletic man standing or kneeling, hands on her shoulders or head, or hands at sides, pelvis thrust forward, full upper body visible,
        thick erect penis moving between breasts, shaft glistening with oil saliva or pre-cum, veins prominent, cock head popping out at top near mouth,
        rhythmic breast fucking motion, breasts moving up and down on shaft, cock sliding through soft cleavage, thrusting through tits,
        seductive eye contact, tongue licking tip when it emerges, sensual breast sex, erotic paizuri, teasing with breasts,
        bedroom setting, kneeling position, warm soft lighting on breasts, dramatic shadows in cleavage, close-up composition on breasts and cock, upper body focus,
        photorealistic, 8K UHD, hyperrealistic, huge soft breasts, tight cleavage, glistening lubrication, detailed, masterpiece""",
    
    "cunnilingus": """score_9, score_8_up, score_7_up,
        1girl 1boy, cunnilingus, eating pussy, oral sex on woman, man's head between legs, full body view,
        woman lying on back on bed, legs spread wide apart, thighs open, knees bent up, feet flat on bed or legs draped over man's shoulders, body relaxed receiving pleasure,
        beautiful woman, 25 years old, blonde hair spread out on pillow, messy from motion,
        gorgeous face showing pleasure, blue eyes closed or rolled back, mouth open moaning, head tilted back, expression of ecstasy, face flushed,
        large perky breasts visible, nipples erect, rising and falling with breathing, athletic toned body, flat stomach, narrow waist,
        smooth tan skin, light sweat forming, realistic texture, flushed pink from arousal,
        legs spread maximally, thighs trembling, pussy fully exposed, labia visible, wetness glistening, man's head positioned between thighs, face buried in pussy,
        hands gripping his hair pushing him closer, or hands on own breasts, fingers clenching sheets, body arching,
        athletic man lying on stomach between her legs, head buried in pussy, hands on inner thighs spreading legs wider, shoulders between thighs, full body visible from side or top,
        tongue licking pussy, oral stimulation visible, eating her out passionately, face pressed into wetness,
        hips bucking against face, grinding on tongue, thighs squeezing head, body writhing with pleasure, building to orgasm,
        moaning loudly, back arching off bed, overwhelming oral pleasure, legs shaking, about to cum,
        bedroom setting, rumpled sheets, soft warm romantic lighting, golden glow, intimate atmosphere, full body composition or close-up on action,
        photorealistic, 8K UHD, hyperrealistic, oral pleasure, detailed, intimate, masterpiece""",
    
    "face_sitting": """score_9, score_8_up, score_7_up,
        1girl 1boy, face sitting, sitting on face, dominant woman, riding face, full body or close-up,
        woman sitting on man's face, straddling his head, thighs on either side of face, knees on bed or ground, pussy pressed directly on mouth and nose, ass prominent, dominant position,
        stunning woman, 27 years old, blonde hair loose flowing or in ponytail,
        gorgeous face looking down at him or forward, blue eyes showing dominance, mouth open moaning, expression of pleasure and power, dominant expression, confident,
        large natural breasts, nipples erect, athletic body, narrow waist, wide hips, thick thighs, round prominent ass, powerful legs,
        smooth tan skin, glistening with sweat, realistic texture,
        sitting fully on face, pussy pressed on mouth, grinding on face, thighs squeezing head, ass prominent from behind view, hands on headboard or wall for support, or hands on own body,
        man lying on back flat, face completely covered by pussy and ass, nose and mouth buried, hands on her hips or thighs or ass, gripping, lying helpless underneath,
        mouth and tongue pleasuring pussy, eating her out while she sits, oral from below, tongue working while smothered,
        grinding motion on face, hips rolling, riding face, rubbing pussy on mouth and tongue, using his face for pleasure, dominant grinding rhythm,
        dominant pleasure, using him for satisfaction, taking what she wants, smothering control, powerful position, grinding orgasm building,
        bedroom setting, bed view, dominant woman on top, dramatic lighting from above, full body showing power dynamic or close-up on action,
        photorealistic, 8K UHD, hyperrealistic, dominant woman, face smothered, grinding motion, powerful, masterpiece""",
    
    "69_position": """score_9, score_8_up, score_7_up,
        1girl 1boy, 69 position, mutual oral sex, simultaneous oral, reciprocal pleasure, side view full body,
        woman on top lying on man, body inverted, head at his crotch, pussy at his face, or side by side lying, bodies aligned opposite, mutual oral access,
        beautiful woman, 26 years old, blonde hair in ponytail,
        gorgeous face at his crotch, mouth on penis, giving oral, eyes closed or looking at cock, focused on pleasuring,
        large breasts hanging or pressed, body aligned, athletic form, pussy at his face level,
        smooth skin, sweating lightly, bodies pressed together,
        mouth on penis sucking, head bobbing, giving blowjob while receiving, hands on his thighs or holding shaft, simultaneous pleasure,
        man lying on back or side, mouth on her pussy, tongue licking, eating her out, hands on her ass or hips pulling closer, giving oral while receiving,
        both performing oral simultaneously, cocks in mouth while pussy being eaten, tongues working, mutual stimulation, reciprocal pleasure,
        synchronized oral motion, both pleasuring each other, simultaneous sucking and licking, mutual satisfaction, 69 rhythm,
        mutual pleasure, giving and receiving simultaneously, equal oral exchange, pleasuring each other,
        bedroom setting, bed, side view angle showing both bodies, warm lighting, mutual composition, full bodies visible,
        photorealistic, 8K UHD, hyperrealistic, mutual oral, simultaneous pleasure, detailed, intimate, masterpiece""",

    "licking_dick": """score_9, score_8_up, score_7_up,
        1girl 1boy, licking penis, tongue on cock, teasing oral, slow sensual, close-up,
        woman kneeling or lying, face close to penis, mouth not fully wrapped just tongue out licking, teasing position,
        beautiful woman, 24 years old, blonde hair loose or ponytail,
        gorgeous face close to cock, blue eyes looking up seductively, maintaining eye contact, tongue extended out licking, lips close, teasing expression, playful smile,
        large breasts visible, cleavage showing, athletic body,
        smooth tan skin, natural lighting,
        tongue extended fully out, licking up shaft slowly, tongue swirling around tip, flicking on sensitive areas, long licks from base to tip, teasing licks, saliva coating cock,
        hand holding penis shaft presenting it, other hand gently stroking or cupping balls, fingers delicate,
        man standing or sitting, legs spread, watching her tease, hands relaxed or in hair, full body visible,
        thick erect penis being licked, shaft glistening from saliva, cock head being swirled, veins prominent,
        slow teasing licking motion, tongue exploring every inch, sensual oral teasing, playful licking, building anticipation,
        seductive teasing, playful eye contact, taking her time, enjoying teasing him, erotic build-up,
        bedroom, soft warm lighting, close-up on face and cock, intimate teasing atmosphere,
        photorealistic, 8K UHD, hyperrealistic, tongue visible, teasing oral, sensual, detailed, masterpiece""",

    "footjob": """score_9, score_8_up, score_7_up,
        1girl 1boy, footjob, feet on penis, foot sex, foot pleasure, lower body focus,
        woman sitting or lying back, legs extended forward, feet together or one foot on cock, toes and soles visible, legs smooth and toned,
        beautiful woman, 25 years old, blonde hair loose, relaxed position,
        gorgeous face watching or looking away casual, blue eyes playful, slight smile, relaxed expression, teasing demeanor,
        large breasts visible, athletic body relaxed, leaning back supported,
        smooth tan skin, pedicured toes, feet well-maintained, high arches,
        feet positioned on penis, soles rubbing shaft, toes curling around cock, both feet sandwiching penis, arches stroking, one foot on balls, stroking motion with feet,
        hands supporting body leaning back, or hands on ankles helping guide feet, casual position,
        man sitting or lying, legs spread, cock between her feet, hands on thighs or bed, receiving foot pleasure, full lower body visible,
        thick erect penis between feet, shaft being stroked by soles and toes, cock glistening, balls visible, veins prominent,
        feet stroking up and down shaft, toes curling, soles rubbing rhythmically, alternating foot motion, sensual foot movements,
        playful teasing, casual foot play, watching him react, amused by foot pleasure, unique stimulation,
        bedroom or living room, couch or bed, focus on feet and cock, soft lighting, casual intimate atmosphere, lower body composition,
        photorealistic, 8K UHD, hyperrealistic, detailed feet and toes, foot fetish, unique pleasure, masterpiece""",

    "nursing_handjob": """score_9, score_8_up, score_7_up,
        1girl 1boy, nursing handjob, gentle handjob, caring touch, intimate handjob, close-up upper body,
        woman sitting or kneeling beside man, body close, leaning in intimately, upper body visible,
        beautiful woman, 28 years old, brown hair loose or ponytail, mature caring,
        gorgeous face close to his, brown eyes warm and caring, gentle loving expression, soft smile, tender gaze, maternal caring,
        medium natural breasts, soft feminine body, gentle curves,
        smooth fair skin, warm soft glow,
        hand wrapped around penis shaft, fingers gently stroking, thumb on tip, other hand cupping balls gently, caring delicate touch, rhythmic gentle pumping,
        looking at his face caring, checking his pleasure, making eye contact, intimate connection, or looking at cock,
        man lying or sitting, relaxed receiving, looking at her, hand on her back or thigh, trusting position, full upper body visible,
        thick erect penis in her hand, shaft glistening with lubricant or pre-cum, cock head visible, veins prominent,
        gentle rhythmic stroking up and down shaft, caring pump motion, tender loving movements, soft squeezes, careful pleasure,
        caring intimacy, nurturing touch, loving attention, gentle nursing, emotional connection, tender care,
        bedroom setting, soft bed, warm romantic lighting, intimate close, caring atmosphere, close-up composition on hands and faces,
        photorealistic, 8K UHD, hyperrealistic, gentle caring, intimate handjob, emotional, masterpiece""",

    "pov_eating_out": """score_9, score_8_up, score_7_up,
        1girl, POV cunnilingus, receiving oral POV perspective, woman's perspective, POV angle looking down,
        woman lying on back, POV from her perspective looking down between own legs at man's head, thighs framing view, feet visible in foreground, body visible from own perspective,
        beautiful woman, 25 years old, blonde hair visible falling on sides,
        POV looking down, seeing own body, breasts visible in view, stomach visible, thighs framing perspective,
        large breasts visible in own view, nipples erect, body from own eyes, hands visible reaching down,
        smooth tan skin visible from self-view,
        legs spread open, thighs apart framing view, pussy visible being pleasured, man's head visible between legs from above, hair visible, face buried, POV perspective,
        hands visible in frame reaching down to hold his head, fingers in his hair visible from own perspective,
        man's head and shoulders visible from above between legs, hands on inner thighs visible, performing oral, tongue working,
        receiving oral pleasure, feeling sensations, pleasure building, from woman's perspective experiencing, sensations focused,
        moaning from pleasure, looking down watching him, feeling tongue, pleasure waves, approaching orgasm from POV,
        bedroom, bed, looking down perspective, POV angle, lighting from woman's view, intimate POV composition,
        photorealistic, 8K UHD, hyperrealistic, POV perspective, receiving oral, immersive view, detailed, masterpiece""",

    "glory_hole": """score_9, score_8_up, score_7_up,
        1girl 1boy, glory hole blowjob, anonymous oral through wall, hole in wall, public setting close-up,
        woman kneeling on floor facing wall with hole, bathroom stall or glory hole setup, anonymous encounter, separated by wall,
        beautiful woman, 24 years old, blonde hair loose,
        gorgeous face at wall height, blue eyes looking at cock through hole, mouth approaching hole, curious or experienced expression,
        medium breasts, clothed or topless, casual or public clothing,
        skin visible, kneeling position,
        mouth approaching hole in wall, lips wrapping around penis emerging through wall, sucking cock through hole, hands supporting on wall, anonymous oral,
        penis emerging through hole in wall, only cock visible, rest of man on other side unseen, anonymous setup,
        thick erect penis through hole, shaft through wall, cock head visible on her side,
        sucking motion through wall, anonymous blowjob, oral through glory hole, servicing stranger, public anonymous encounter,
        anonymous thrill, public excitement, stranger encounter, taboo situation, forbidden pleasure,
        bathroom stall, glory hole wall, public restroom, anonymous setting, dim lighting, close-up on hole and action,
        photorealistic, 8K UHD, hyperrealistic, glory hole setup, anonymous encounter, public setting, detailed, masterpiece""",

    "double_blowjob": """score_9, score_8_up, score_7_up,
        2girls 1boy, double blowjob, two women sharing cock, threesome oral, shared blowjob, close-up,
        two women kneeling side by side facing man's crotch, bodies close together, both at cock level, faces close touching,
        two beautiful women, both 25 years old, blonde and brunette, hair loose or ponytails,
        gorgeous faces side by side, both looking up at man, eyes meeting his gaze, mouths on same cock, tongues visible, competitive or cooperative expressions, sexy teamwork,
        large breasts on both women, bodies close, intimate proximity,
        smooth skin on both, realistic detailed,
        both mouths on penis simultaneously, lips touching, tongues meeting on shaft, taking turns sucking, sharing cock, kissing around dick, one licking shaft while other sucks tip, coordinated oral, both pleasuring together,
        hands of both women on cock, one stroking shaft while other cups balls, four hands on one dick, touching each other's faces around cock,
        man standing or sitting, legs spread wide, hands on both heads, fingers in both women's hair, receiving double pleasure, overwhelmed by two mouths,
        thick erect penis covered in double saliva, shaft glistening, both women's lips and tongues on it, cock head switching between mouths,
        synchronized oral motion, taking turns, both licking and sucking together, sharing blowjob duties, double team oral,
        shared experience, competitive pleasuring, teamwork oral, both trying to please, threesome intimacy, double attention,
        bedroom, kneeling together, warm lighting on three people, close-up on double oral, threesome composition,
        photorealistic, 8K UHD, hyperrealistic, two mouths one cock, shared blowjob, double team, detailed, masterpiece""",

    
    # ============================================
    # MASTURBATION & SOLO CATEGORY
    # ============================================
    "fingering_solo": """score_9, score_8_up, score_7_up,
        1girl, solo masturbation, fingering, self pleasure, fingers inside pussy, full body or close-up,
        woman lying on back on bed or sitting, legs spread wide apart, knees bent up, thighs open, body exposed, comfortable masturbation position,
        stunning woman, 24 years old, blonde hair spread on pillow or loose,
        gorgeous face showing pleasure, blue eyes half-closed or closed, mouth open moaning, head tilted back, expression of ecstasy building, face flushed, lost in sensation,
        large perky breasts, one hand possibly on breast squeezing, nipples erect hard, athletic toned body, flat stomach, narrow waist,
        smooth tan skin, light sweat forming, glistening slightly, flushed pink skin from arousal, realistic detailed texture,
        legs spread maximally, thighs trembling slightly, pussy fully exposed, labia visible spread, one hand between legs, fingers penetrating pussy, two or three fingers inside vaginal opening, fingering deeply, other hand on clit rubbing, or hand on breast,
        fingers moving in and out rhythmically, hand motion visible, wrist moving, fingers curved finding g-spot, thumb on clit circling, intense self-pleasure, deep fingering,
        hips bucking against own hand, grinding on fingers, back arching off bed, body writhing with self-induced pleasure, building to climax, solo orgasm approaching,
        moaning softly, pleasuring herself, eyes closed in bliss, completely focused on sensation, self-love, intimate solo moment,
        bedroom setting, rumpled sheets, soft intimate lighting, golden glow, private atmosphere, close-up on action or full body composition,
        photorealistic, 8K UHD, hyperrealistic, detailed fingers inside pussy, self pleasure, masturbation, intimate solo, masterpiece""",

    "dildo_solo": """score_9, score_8_up, score_7_up,
        1girl, solo, dildo, sex toy, inserting dildo, masturbation with toy, full body,
        woman lying on back or sitting, legs spread wide, knees bent, comfortable position, using sex toy on herself, solo toy play,
        beautiful woman, 25 years old, blonde hair loose or ponytail, messy from pleasure,
        gorgeous face showing intense pleasure, blue eyes focused on sensation or closed, mouth open moaning, expression of arousal, flushed cheeks,
        large natural breasts, one hand possibly squeezing breast, nipples erect, athletic body, toned stomach,
        smooth tan skin, sweating from exertion, glistening, realistic texture,
        legs spread widely, thighs open and trembling, pussy visible, labia spread, large dildo toy visible, hand gripping base of dildo, thick toy penetrating pussy, dildo inserted deep, vaginal opening stretched around toy, realistic dildo visible,
        hand moving dildo in and out rhythmically, thrusting toy, deep penetration with dildo, rhythmic toy fucking motion, other hand on clit rubbing, intense toy masturbation,
        hips bucking against toy, riding dildo, body arching, writhing with pleasure from toy, building to intense orgasm, solo toy climax,
        moaning from toy, pleasuring herself intensely, eyes rolling back, overwhelming toy pleasure, satisfying herself, solo satisfaction,
        bedroom setting, bed, sex toy visible clearly, intimate private lighting, warm glow, close-up on toy insertion or full body,
        photorealistic, 8K UHD, hyperrealistic, dildo visible clear, sex toy detail, solo masturbation, realistic toy, masterpiece""",

    "pillow_humping": """score_9, score_8_up, score_7_up,
        1girl, solo, pillow humping, grinding on pillow, dry humping, masturbation on pillow, side view,
        woman straddling large pillow on bed, sitting on pillow, knees on bed either side, hips positioned over pillow, grinding position, body upright or leaning forward,
        beautiful woman, 23 years old, blonde hair messy from motion, loose,
        gorgeous face showing pleasure, blue eyes half-closed, mouth open panting, expression of arousal, cute pleasurable face, cheeks flushed,
        medium perky breasts bouncing slightly, nipples erect visible through thin clothing or nude, athletic slim body, narrow waist,
        smooth fair skin, light sweat forming, flushed pink,
        straddling pillow with thighs, pussy pressed against pillow, grinding crotch on soft pillow, hips moving, hands gripping pillow edges or headboard for leverage, rhythmic humping motion,
        hips rocking back and forth on pillow, grinding pussy against pillow, rhythmic humping, dry humping motion, building friction, pleasurable grinding rhythm,
        grinding harder, picking up pace, seeking friction pleasure, building orgasm from pillow humping, desperate humping,
        moaning from grinding, pleasuring herself on pillow, private masturbation, solo intimate moment, pillow satisfaction,
        bedroom, bed with large pillow, soft sheets, intimate private lighting, side view composition showing grinding motion,
        photorealistic, 8K UHD, hyperrealistic, pillow humping visible, grinding motion, solo pleasure, realistic, masterpiece""",

    "squirting": """score_9, score_8_up, score_7_up,
        1girl, solo or with partner, squirting, female ejaculation, intense orgasm, gushing, close-up or full body,
        woman lying on back, legs spread maximally wide, knees up, thighs trembling violently, body convulsing, peak orgasm position, completely overcome,
        stunning woman, 26 years old, blonde hair wild and messy from intensity,
        gorgeous face contorted in extreme pleasure, blue eyes rolled back completely showing whites, mouth gaped wide open screaming, tongue out, ahegao expression extreme, face flushed deep red, completely lost in climax,
        large breasts, nipples extremely erect, body arched and convulsing, stomach muscles clenched,
        skin flushed red all over, sweating profusely, glistening wet,
        legs spread and shaking uncontrollably, pussy visible gushing, liquid squirting out forcefully, female ejaculation stream visible, fluids spraying, puddle forming, sheets soaked, extreme wetness, clear liquid ejaculating,
        hand between legs or partner's hand visible, fingers moving rapidly, or dildo visible, intense stimulation causing squirting, g-spot stimulation visible result,
        if partner present: man's hand fingering rapidly causing squirt, fingers inside moving fast,
        body convulsing violently, back arched extreme, uncontrollable shaking, intense squirting orgasm, gushing fluids, overwhelming climax, peak pleasure moment,
        screaming in orgasm, completely overwhelmed, lost in squirting climax, intense release, uncontrollable pleasure,
        bedroom, sheets completely soaked, wet spot large, puddle visible, intense dramatic lighting, close-up on squirting or full body convulsion,
        photorealistic, 8K UHD, hyperrealistic, squirting visible clear, female ejaculation, liquid stream, intense orgasm, wet, masterpiece""",

    "spread_pussy": """score_9, score_8_up, score_7_up,
        1girl, solo, spreading pussy, spreading labia, hands on genitals, explicit genital view, close-up,
        woman lying on back or sitting, legs spread maximally wide apart, knees bent up high, thighs open completely, full genital exposure, inviting position,
        beautiful woman, 25 years old, blonde hair loose,
        gorgeous face looking at viewer or down at pussy, blue eyes seductive or focused, mouth slightly open, inviting expression, aroused look,
        medium perky breasts visible, nipples erect, athletic body, flat stomach,
        smooth tan skin, natural lighting on genitals,
        legs spread completely wide, thighs maximally apart, hands between legs, fingers on labia lips, pulling labia apart spreading wide, pussy opened fully, vaginal opening gaped visible, pink inner walls exposed, clit visible prominent, wetness glistening inside, completely spread and exposed,
        fingers gently spreading lips wider, showing everything, opening pussy for view, inviting penetration, presenting genitals,
        looking inviting, offering access, seductive spread, presenting herself, ready and willing, explicitly showing,
        bedroom or studio, focus entirely on spread pussy, dramatic lighting on genitals, close-up macro focus, explicit composition,
        photorealistic, 8K UHD, hyperrealistic, extreme genital detail, labia spread, vaginal opening visible, wet pussy, explicit, masterpiece""",

    "vibrator": """score_9, score_8_up, score_7_up,
        1girl, solo, vibrator, using vibrator, magic wand, toy masturbation, full body or close-up,
        woman lying on back or sitting, legs spread, relaxed position, using powerful vibrator on herself, toy clearly visible,
        beautiful woman, 24 years old, blonde hair loose, messy,
        gorgeous face showing intense pleasure, blue eyes closed tight or rolled back, mouth open moaning, expression of overwhelming sensation, biting lip, face flushed,
        large perky breasts, one hand possibly on breast, nipples erect hard, athletic body,
        smooth tan skin, sweating from intense stimulation, realistic texture,
        legs spread comfortably, thighs open, large vibrator toy visible pressed against pussy, vibrator on clit, toy buzzing visibly, hand holding vibrator firmly pressing, wetness visible around toy, intense stimulation,
        vibrator pressed hard against clit, intense vibration stimulation, body reacting to powerful sensation, toy making her shake, overwhelming pleasure from vibrator,
        body trembling from vibrator, legs shaking, hips bucking against toy, moaning loudly from intensity, approaching rapid orgasm, vibrator bringing her to edge,
        overwhelmed by vibrator, intense pleasure, powerful toy stimulation, rapid climax building, uncontrollable moaning,
        bedroom, bed, large vibrator toy prominent, intimate lighting, focus on toy and reaction, close-up or full body,
        photorealistic, 8K UHD, hyperrealistic, vibrator visible clear, toy detail, intense stimulation, solo pleasure, masterpiece""",

    "stuck": """score_9, score_8_up, score_7_up,
        1girl, solo, stuck pose, trapped under furniture, ass exposed, helpless position, full body,
        woman bent over stuck under bed or table, upper body hidden underneath furniture, ass and lower body exposed behind, legs visible, stuck and helpless, playful scenario,
        beautiful woman, 25 years old, blonde hair visible from behind,
        face hidden under furniture, only lower body visible from behind, body bent over stuck, helpless situation,
        lower body visible, hips and ass prominent, legs visible,
        smooth tan skin, exposed lower body,
        ass raised high exposed, bent over stuck position, pussy visible from behind, legs spread trying to pull free, hips wiggling, unable to move, trapped and exposed, vulnerable ass up,
        body struggling trying to get free, hips wiggling and squirming, legs pushing, pulling motion, stuck fast, cannot escape, wiggling helplessly,
        hips moving desperately, trying to free herself, vulnerable exposed position, ass wiggling, stuck and helpless, trapped scenario,
        frustrated at being stuck, vulnerable position, exposed helplessly, playful stuck scenario, comedic yet erotic,
        bedroom or living room, stuck under furniture, ass and legs visible, playful lighting, humorous yet sexy scenario, full body from behind,
        photorealistic, 8K UHD, hyperrealistic, stuck position, ass exposed, playful scenario, helpless, detailed, masterpiece""",

    "shower_masturbation": """score_9, score_8_up, score_7_up,
        1girl, solo, showering, masturbation in shower, water running, wet body, full body,
        woman standing in shower, water cascading down body, one leg raised on shower ledge, hand between legs, masturbating under water, steamy environment,
        stunning woman, 26 years old, blonde hair completely wet slicked back, water streaming down,
        gorgeous wet face, blue eyes closed or half-closed, mouth open, water droplets on face, expression of pleasure, steamy atmosphere,
        large natural breasts wet, water running down breasts, nipples erect hard from water and arousal, water droplets, athletic body glistening wet,
        wet tan skin completely, water streaming down entire body, glistening wet realistic texture, droplets everywhere,
        legs spread with one raised, standing in shower, hand between legs fingering pussy, fingers inside vaginal opening, water running over hand and pussy, steam surrounding, wet body masturbating,
        fingers moving inside pussy, masturbating in shower, water enhancing sensation, pleasuring herself under water, rhythmic fingering,
        leaning against wet tile, moaning under water stream, water cascading creating intimate atmosphere, shower masturbation, building wet orgasm,
        pleasure in warm water, steam surrounding, private shower moment, water streaming creating sensual atmosphere, intimate solo,
        luxury shower, marble tile, rainfall showerhead, water streaming, steam heavy, glass fogged, wet environment, full body in shower,
        photorealistic, 8K UHD, hyperrealistic, wet skin detailed, water droplets, steam atmosphere, shower setting, realistic, masterpiece""",

    
    # ============================================
    # BODY FOCUS CATEGORY
    # ============================================
    "boobs_close": """score_9, score_8_up, score_7_up,
        1girl, solo, close-up breasts, breast focus, extreme close-up, detailed nipples, topless portrait,
        woman topless, upper body focus, chest prominent, close framing on breasts only, shoulders and face may be partially visible,
        beautiful woman, 25 years old, blonde hair visible partially,
        gorgeous face partially visible at top of frame or just below frame, blue eyes may be visible looking down, expression sensual or neutral,
        extremely large natural breasts, close-up filling frame, breast focus extreme, nipples prominently displayed, areolas detailed visible, breast shape natural hanging, cleavage deep, soft breast texture, realistic natural hang and weight, detailed skin texture on breasts,
        smooth tan skin on breasts, realistic detailed pores visible, subtle freckles maybe, natural breast skin texture, slight sweat sheen, soft lighting on curves,
        hands may be visible cupping breasts, squeezing gently, lifting, or no hands just natural hang, breasts displayed, nipples centered in frame,
        breasts natural position, slight movement, breathing motion, gentle sway, natural weight,
        presenting breasts, close intimate view, detailed breast focus, macro breast view, inviting touch,
        studio or bedroom, dramatic lighting on breasts, shadows enhancing curves, focused lighting on nipples, artistic dramatic shadows, extreme close-up composition, breast macro focus,
        photorealistic, 8K UHD, hyperrealistic, extreme breast detail, skin texture visible, pores, realistic natural breasts, detailed nipples, masterpiece""",

    "pussy_close": """score_9, score_8_up, score_7_up,
        1girl, solo, close-up pussy, genital focus, extreme close-up, detailed labia, explicit macro view,
        woman lying back or sitting, legs spread wide open, thighs maximally apart, entire focus on genital area, extreme close-up framing, only pussy visible in frame,
        beautiful woman, 25 years old, identity not main focus, body partially visible,
        face not visible, focus entirely on genitals, extreme genital close-up,
        lower body only, focus on pussy exclusively, legs framing shot,
        smooth tan skin around genitals, natural realistic texture on labia and inner thighs,
        legs spread completely, thighs maximally apart framing pussy, pussy centered in frame filling view, labia lips detailed visible, outer labia full, inner labia pink delicate visible, vaginal opening visible, clit hood and clit visible prominent, wetness glistening on labia, moisture visible, detailed texture on every fold, realistic genital anatomy, extreme detail on every part,
        pussy fully displayed, natural position, slight pulsing motion maybe, wetness catching light, natural labia position,
        spreading naturally, fully exposed, inviting view, intimate macro, explicitly showing genitals, detailed intimate view,
        studio or bedroom, dramatic focused lighting on pussy, shadows enhancing folds, wet reflection visible, artistic genital lighting, extreme macro close-up composition, genital focus filling frame,
        photorealistic, 8K UHD, hyperrealistic, extreme genital detail macro, labia texture, wetness visible, vaginal opening clear, explicit detailed, clinical detail, masterpiece""",

    "ass_close": """score_9, score_8_up, score_7_up,
        1girl, solo, close-up ass, butt focus, rear view extreme close-up, detailed ass, bent over,
        woman bent over presenting ass, back arched, ass raised high toward camera, entire frame filled with ass, close-up rear view, extreme ass focus,
        beautiful woman, 25 years old, blonde hair visible in ponytail maybe,
        face not visible, looking back maybe at edge of frame, back and ass focus,
        body from behind, rear view, ass prominent filling frame,
        smooth tan skin on ass, realistic texture, maybe subtle tan lines, natural skin on ass cheeks,
        ass centered filling frame, round bubble butt, ass cheeks full and firm, butt prominent, detailed texture on ass skin, natural curves and shape, realistic ass anatomy, cheeks spread slightly or together, asshole may be visible between cheeks, pussy visible below from behind angle, ass dimples visible on lower back, full detailed butt,
        ass presented, pushed back toward camera, filling view completely, bent over presenting,
        presenting ass, showing off butt, back arched displaying, inviting rear view, explicit ass display,
        bedroom or studio, dramatic lighting on ass curves, shadows enhancing roundness, rim lighting on curves, artistic ass lighting, extreme close-up ass composition, butt macro focus,
        photorealistic, 8K UHD, hyperrealistic, extreme ass detail, skin texture on butt, realistic round ass, detailed curves, perfect butt, masterpiece""",

    "feet_close": """score_9, score_8_up, score_7_up,
        1girl, solo, close-up feet, foot focus, soles facing camera, detailed toes, foot fetish view,
        woman sitting or lying, feet raised up toward camera, soles facing viewer, toes spread or curled, feet prominent in frame, leg partial visible,
        beautiful woman, 24 years old, blonde hair visible partially,
        gorgeous face visible behind feet or partially, blue eyes looking at camera over feet, playful expression, teasing with feet,
        body partially visible, focus on feet, legs visible leading to feet,
        smooth tan skin on feet and legs, pedicured toes, painted toenails, well-maintained feet, soft skin on soles,
        feet filling frame, soles facing camera front view, toes prominent, five toes visible clearly, toenails painted, detailed wrinkles on soles, arches high, heels visible, balls of feet detailed, realistic foot anatomy, skin texture on feet, feet together or apart, toes spread showing between, detailed every toe,
        feet positioned toward camera, soles shown, toes wiggling or curled, natural foot position,
        showing feet seductively, foot tease, displaying soles, offering feet, foot focus intimate, teasing with feet,
        bedroom or studio, clean background, focused lighting on feet, detailed foot lighting, dramatic foot focus, extreme close-up feet composition, foot fetish framing,
        photorealistic, 8K UHD, hyperrealistic, extreme foot detail, skin texture on soles, toes detailed, realistic feet, pedicure visible, masterpiece""",

    "all_fours_rear": """score_9, score_8_up, score_7_up,
        1girl, solo, all fours position, on hands and knees, rear view, ass up, side view full body,
        woman on hands and knees on bed, body on all fours, back arched, ass raised high, head down or looking back, vulnerable inviting position, side angle view,
        beautiful woman, 24 years old, blonde hair in ponytail or loose,
        gorgeous face looking back over shoulder, blue eyes seductive, mouth slightly open, inviting expression, or face down,
        large breasts hanging down visible from side, nipples visible, athletic body, narrow waist emphasized, wide hips prominent, round bubble butt raised high,
        smooth tan skin, realistic texture, light sweat,
        positioned on all fours, hands planted on bed, arms straight, knees on bed, thighs apart, back arched deeply, ass raised high and prominent, pussy visible from behind between thighs, asshole visible from rear view, legs spread showing everything from behind, presenting position, ready pose,
        holding all fours position, body steady, displaying, ready position, waiting, presenting herself,
        inviting approach from behind, ready and waiting, presenting pussy and ass, submissive ready pose, offering position, explicit display,
        bedroom, bed, side view angle, full body on all fours visible, warm lighting, shadows on curves, intimate ready atmosphere, full body side composition,
        photorealistic, 8K UHD, hyperrealistic, detailed rear view, pussy and ass visible, inviting position, realistic, masterpiece""",

    "spread_ass": """score_9, score_8_up, score_7_up,
        1girl, solo, spread ass, hands spreading ass cheeks, asshole visible, rear explicit view, close-up,
        woman bent over or on all fours, hands reaching back gripping own ass cheeks, pulling cheeks apart spreading wide, complete rear exposure, vulnerable position,
        beautiful woman, 25 years old, blonde hair visible from behind,
        face looking back over shoulder, blue eyes visible, mouth open, expression submissive or inviting, or face down not visible,
        athletic body from behind, narrow waist, wide hips, round prominent bubble butt,
        smooth tan skin, realistic ass texture,
        hands gripping own ass cheeks from behind, fingers digging into soft ass flesh, pulling cheeks completely apart spreading wide, asshole fully exposed visible centered, anal opening detailed visible, anus prominent, pussy visible below also spread, labia visible between spread cheeks, everything exposed completely, extremely explicit rear view, maximum spreading,
        actively pulling cheeks apart wider, spreading ass maximally, showing everything, explicit display, opening completely,
        presenting asshole explicitly, showing anal opening, offering rear access, submissive spreading, completely exposed vulnerable, explicit anal display,
        bedroom or studio, dramatic lighting on spread ass, shadows in crack, rim lighting on curves, explicit lighting, close-up rear composition, spread ass macro focus,
        photorealistic, 8K UHD, hyperrealistic, extreme anal detail, asshole visible clear, spread wide, explicit rear, pussy visible too, detailed, masterpiece""",

    "legs_back": """score_9, score_8_up, score_7_up,
        1girl, solo, holding legs back, legs pulled back, flexible position, pussy exposed, full body,
        woman lying on back on bed, arms reaching down grabbing back of thighs or behind knees, pulling legs back toward head, thighs against chest, feet up high, maximum flexibility, completely exposed position,
        beautiful woman, 24 years old, blonde hair spread on pillow,
        gorgeous face visible between raised legs, blue eyes looking forward at camera, mouth open, expression showing flexibility, flushed cheeks,
        medium perky breasts visible between legs, nipples erect, athletic flexible body, stomach visible,
        smooth tan skin, realistic texture, flushed from position,
        arms reaching down holding legs, hands gripping behind thighs or knees, pulling legs back maximally toward head, thighs pulled against chest and breasts, legs spread wide apart, feet up by head or shoulders, pussy tilted upward fully exposed toward camera, labia visible spread open, vaginal opening visible gaped, asshole visible exposed, completely vulnerable flexible position, everything displayed,
        holding legs pulled back, maintaining flexible position, displaying, opened by leg position, exposed completely,
        showing flexibility, presenting pussy upward, vulnerable exposed pose, flexible display, everything visible, submissive flexible position,
        bedroom, bed, full body view, dramatic lighting, shadows enhancing exposure, flexible position clear, full body composition showing flexibility,
        photorealistic, 8K UHD, hyperrealistic, extreme flexibility, pussy upward exposed, detailed genitals, flexible pose, realistic, masterpiece""",


    # ============================================
    # AFTERMATH CATEGORY
    # ============================================
    "creampie": """score_9, score_8_up, score_7_up,
        1girl, 1boy or solo, creampie, cum dripping from pussy, vaginal cum, semen dripping, aftermath, close-up or full body,
        woman lying on back, legs spread apart, body relaxed post-sex, exhausted satisfied position, pussy exposed, man may be visible pulling out or already separated,
        beautiful woman, 25 years old, blonde hair messy from sex, wild,
        gorgeous face showing satisfaction, blue eyes half-closed tired, mouth open panting, expression of satisfied exhaustion, post-orgasm face, flushed and content,
        large perky breasts, nipples erect or softening, athletic body, stomach visible, post-sex body,
        tan skin glistening with sweat, realistic post-sex texture, satisfied glow,
        legs spread open showing pussy, pussy visible red and used, labia swollen, vaginal opening gaped slightly, thick white cum visible dripping out from pussy, semen flowing from vaginal opening, creampie leaking, cum pooling, white fluid dripping down to ass crack, excessive cum visible, freshly filled pussy, internal cumshot aftermath visible,
        if man visible: penis pulled out visible, just withdrew, cock glistening with cum and fluids, positioned near pussy, may have cum on tip still,
        cum dripping motion, flowing out, gravity pulling semen down, leaking heavily, post-sex fluid escape, creampie visible clearly,
        satisfied tired expression, post-orgasm bliss, catching breath, post-sex satisfaction, exhausted pleasure, filled completely,
        bedroom, rumpled sheets wet, post-sex mess, satisfied lighting, warm after-glow, close-up on creampie or full satisfied body composition,
        photorealistic, 8K UHD, hyperrealistic, cum visible clearly, creampie detailed, semen dripping, post-sex, realistic fluids, masterpiece""",

    "cumshot_face": """score_9, score_8_up, score_7_up,
        1girl, 1boy, facial cumshot, cum on face, semen on face, face covered, close-up facial,
        woman kneeling or sitting, face tilted up or forward, man standing close in front, penis aimed at face, cum shot moment or aftermath, facial in progress or just finished,
        beautiful woman, 25 years old, blonde hair possibly in ponytail, may have cum on hair too,
        gorgeous face covered with cum, blue eyes open looking up or closed from cumshot, mouth open or tongue out, facial expression receiving or just received, surprised or satisfied, face dripping,
        medium perky breasts visible below, may have cum on breasts too, upper body visible,
        fair skin with white cum contrasting, realistic cum texture on face, dripping,
        face tilted up, cum visible on face, white semen on cheeks, nose, forehead, chin, some in hair, thick ropes of cum across face, dripping down, tongue out catching, mouth open, eyes may have cum on lids, facial cumshot result clear, multiple spurts visible,
        man standing, penis visible just finishing cumshot, cock aimed at face, hand stroking last drops, positioned close to face, cumshot just delivered,
        thick penis ejaculating final spurts, cum on tip, shaft visible, cumshot moment captured or just after,
        cum landing on face motion, semen dripping down, facial in progress or aftermath, receiving cumshot, face being covered, coating face,
        satisfied or surprised expression, receiving load, taking facial, post-cumshot reaction, cum covered face displayed,
        bedroom or living room, kneeling for facial, facial cumshot lighting, dramatic cum visibility, close-up on cum-covered face composition,
        photorealistic, 8K UHD, hyperrealistic, cum on face detailed, white semen visible clearly, facial cumshot realistic, detailed cum ropes, masterpiece""",

    "bukkake": """score_9, score_8_up, score_7_up,
        1girl, multiple boys, bukkake, multiple cumshots, face and body covered in cum, gangbang cumshots, close-up or full body,
        woman kneeling surrounded by multiple men, face and upper body exposed, men standing around in circle, multiple cocks aimed at her, group cumshot scenario, surrounded,
        beautiful woman, 24 years old, blonde hair soaked with cum, hair plastered,
        gorgeous face completely covered in cum, blue eyes barely visible through semen, mouth open dripping, face expression overwhelmed, completely covered, face dripping white,
        large breasts covered in cum, cum dripping down breasts, nipples covered, body covered in semen, upper body drenched,
        tan skin barely visible under white cum, completely covered in semen, realistic thick cum covering,
        kneeling surrounded, face and body covered completely in thick white cum, multiple loads visible, cum from multiple sources, face plastered, hair soaked, breasts covered, body drenched, cum dripping everywhere, pooling, excessive semen covering, bukkake result extreme,
        multiple men visible around, some still stroking, cocks visible some still cumming, group of men, multiple penises around her, some finishing,
        multiple thick penises, some cumming, others finished, cocks surrounding, dicks all around,
        multiple cumshots landing, semen flying from multiple directions, covered in cum from group, bukkake in progress or aftermath, gangbang cumshot,
        overwhelmed by cum, completely covered, taking multiple loads, surrounded by cock, group cumshot target, bukkake victim,
        bedroom or group setting, surrounded by men, multiple men visible, bukkake lighting showing cum, dramatic group composition, cum visibility extreme,
        photorealistic, 8K UHD, hyperrealistic, excessive cum visible, multiple loads, completely covered, bukkake detailed, group scene, masterpiece""",

    "cum_on_body": """score_9, score_8_up, score_7_up,
        1girl, 1boy, cum on body, semen on skin, covered in cum, body cumshot, full body aftermath,
        woman lying on back or sitting, body exposed, post-sex position, man visible nearby or just pulled out, cumshot just delivered on body,
        beautiful woman, 26 years old, blonde hair messy from sex,
        gorgeous face satisfied, blue eyes looking at mess or at man, slight smile, satisfied expression, post-sex glow,
        large breasts with cum on them, nipples visible maybe covered in cum, athletic body, stomach covered in cum, body displayed,
        tan skin with white cum contrasting, glistening with sweat and semen, realistic cum texture on body,
        body displayed, cum visible on breasts, belly, possibly thighs, white semen pooled on stomach, ropes of cum across chest, dripping down sides, multiple spurts visible on body, cum from breasts to stomach, maybe on face too, body cumshot result clear,
        man visible, penis still visible dripping final drops, just finished cumming on her body, hand on own cock, positioned over her,
        thick penis finishing cumshot, cum on tip, final drops falling, shaft glistening,
        cum dripping down curves, semen flowing, body cumshot aftermath, covering her body, coating skin,
        satisfied with mess, admiring cum on body, post-cumshot satisfaction, covered and pleased, body marked,
        bedroom, lying or sitting, body cumshot aftermath, lighting showing cum clearly, warm satisfied lighting, full body composition showing cum coverage,
        photorealistic, 8K UHD, hyperrealistic, cum on body detailed, semen visible, white cum contrast, body cumshot realistic, masterpiece""",

    "ahegao_breeding": """score_9, score_8_up, score_7_up,
        1girl, 1boy, ahegao, breeding, creampie, extreme orgasm face, eyes rolled, tongue out, full body or close-up,
        woman lying on back, legs spread wide, being bred, body in extreme orgasm, complete loss of control position, mating position, deep breeding,
        beautiful woman, 24 years old, blonde hair wild and messy, hair everywhere,
        gorgeous face showing extreme ahegao expression, blue eyes completely rolled back showing only whites, mouth gaped maximally open, tongue hanging out drooling, saliva dripping, face expression of overwhelming pleasure, complete mind break, lost in sensation, intense orgasm face, flushed extremely red,
        large breasts, nipples erect, body arched, athletic form convulsing,
        skin flushed deep red all over, sweating profusely, glistening wet,
        legs spread maximally, pussy visible with cum dripping, being bred deeply, creampie aftermath, semen visible leaking, internal cumshot just delivered, breeding complete, pussy filled and dripping,
        man visible, positioned between legs or just pulled out, penis visible dripping, just bred her, breeding position,
        thick penis visible, just came inside, cock dripping with cum and pussy fluids, breeding cock,
        body convulsing in orgasm, ahegao face extreme, completely overwhelmed, mind break pleasure, breeding orgasm, intense climax, complete sensory overload,
        completely overwhelmed, ahegao expression, bred completely, mind broken by pleasure, breeding successful, lost in orgasm,
        bedroom, breeding scene, intense lighting, dramatic shadows, ahegao visible clear, breeding atmosphere, close-up on face or full body composition,
        photorealistic, 8K UHD, hyperrealistic, ahegao detailed, eyes rolled back, tongue out, breeding scene, creampie visible, intense, masterpiece""",

    "cumshot_doggystyle": """score_9, score_8_up, score_7_up,
        1girl, 1boy, cumshot, doggystyle cumshot aftermath, cum on ass, cum on back, rear view,
        woman on all fours position, ass raised, man just pulled out from behind, cumshot just delivered on her ass and back, post-sex doggy position,
        beautiful woman, 25 years old, blonde hair in messy ponytail,
        gorgeous face looking back over shoulder, blue eyes satisfied, mouth open panting, expression of satisfaction, post-orgasm glow,
        large breasts hanging, nipples visible from side, athletic body, narrow waist, wide hips,
        tan skin with white cum contrasting, glistening with sweat, realistic textures,
        on all fours, ass raised high prominent, back arched, cum visible on ass cheeks, white semen ropes across ass, cum on lower back, cum dripping down ass crack, maybe cum on pussy lips below, doggystyle cumshot result clear, ass painted with cum,
        man kneeling behind, penis visible just finished cumming, cock aimed at ass, hand stroking final drops, positioned behind her,
        thick penis finishing, cum visible on tip, last drops dripping, shaft glistening,
        cum dripping down ass, semen flowing, doggystyle cumshot aftermath, painting ass, coating cheeks,
        satisfied from behind, ass covered, doggy cumshot received, post-sex from behind, marked ass,
        bedroom, on all fours on bed, doggystyle aftermath, lighting on cum-covered ass, warm lighting, rear view composition showing cum coverage,
        photorealistic, 8K UHD, hyperrealistic, cum on ass detailed, white semen visible, doggystyle cumshot, ass covered, realistic, masterpiece""",

    "morning_after": """score_9, score_8_up, score_7_up,
        1girl, solo or with partner, morning after, waking up nude, post-sex morning, satisfied smile, full body,
        woman lying in bed, waking up, body nude under tangled sheets, stretching, satisfied post-sex morning, sheets partially covering, comfortable relaxed position,
        beautiful woman, 27 years old, blonde hair messy bedhead, natural morning look,
        gorgeous face with satisfied smile, blue eyes opening or looking at camera, gentle expression, happy satisfied, morning glow, natural beauty, post-sex satisfaction visible,
        medium natural breasts partially covered by sheet, nipples maybe visible, soft feminine body, natural curves, relaxed nude,
        fair skin natural morning glow, realistic skin, natural beauty, subtle marks maybe,
        lying in messy bed, nude body partially visible under rumpled sheets, sheets tangled around legs, maybe revealing ass or breasts, comfortable naked in bed, satisfied nude, morning stretch, marks from passionate night maybe visible on skin,
        if partner visible: man sleeping beside her or partially visible, intimate morning scene,
        waking up together maybe, morning intimacy, post-sex comfort, satisfied couple,
        morning stretching, satisfied waking, comfortable nudity, post-sex bliss, happy morning after, satisfied glow,
        remembering night before, satisfied with passion, happy morning, comfortable nakedness, post-sex happiness, intimate morning,
        bedroom, rumpled bed, morning sunlight streaming through window, golden morning light, warm morning glow, soft natural lighting, intimate morning atmosphere, full body in bed composition,
        photorealistic, 8K UHD, hyperrealistic, natural morning light, post-sex satisfaction, intimate morning, realistic bedhead, soft focus, masterpiece""",

    "titfuck_cumshot": """score_9, score_8_up, score_7_up,
        1girl, 1boy, titfuck cumshot, cum on breasts, paizuri cumshot, semen on chest, close-up upper body,
        woman kneeling or sitting, large breasts visible, man standing or kneeling in front, just finished titfuck, cumshot just delivered between and on breasts,
        stunning woman, 26 years old, blonde hair in ponytail or loose,
        gorgeous face looking down at cum on breasts or up at man, blue eyes satisfied, tongue maybe out licking, mouth open, expression satisfied with result,
        extremely large natural breasts covered in cum, nipples visible possibly covered in semen, cleavage with cum pooled, upper body displayed, breasts prominent,
        smooth fair skin with white cum contrasting, glistening,
        kneeling or sitting, breasts visible, thick white cum visible on and between breasts, semen ropes across cleavage, cum pooled in cleavage valley, cum on nipples, some cum dripping down to stomach, titfuck cumshot result clear, breasts painted,
        hands maybe holding breasts displaying cum, squeezing gently showing result,
        man visible above, penis visible dripping last drops aimed at breasts, hand on cock finishing, positioned over breasts,
        thick penis finishing cumshot, tip above breasts, final drops falling, cum on tip,
        cum covering breasts, semen dripping down, titfuck cumshot delivered, covering cleavage, coating breasts,
        satisfied with breast cumshot, admiring cum on tits, tit fuck result satisfaction, breasts covered and pleased, marked breasts,
        bedroom or living room, kneeling position, titfuck cumshot aftermath, lighting emphasizing cum on breasts, dramatic contrast, close-up on cum-covered breasts composition,
        photorealistic, 8K UHD, hyperrealistic, cum on breasts detailed, huge tits covered, semen visible, titfuck cumshot realistic, masterpiece""",

    
    # ============================================
    # BDSM CATEGORY
    # ============================================
    "handcuffs": """score_9, score_8_up, score_7_up,
        1girl, solo or 1boy, handcuffs, hands cuffed behind back, restrained, bondage light, full body,
        woman standing or kneeling, hands cuffed behind back, wrists bound by metal handcuffs, body exposed and vulnerable, unable to use hands, submissive position,
        beautiful woman, 24 years old, blonde hair in ponytail or loose,
        gorgeous face showing submission, blue eyes looking at camera or down, mouth slightly open, expression submissive vulnerable, slight fear mixed with arousal,
        large perky breasts exposed, nipples erect, body unable to cover self, athletic nude body, helpless display,
        smooth tan skin, realistic texture, maybe slight marks from restraints,
        standing or kneeling, hands cuffed behind back, wrists bound together in metal cuffs, arms pulled back, unable to move hands, breasts thrust forward from position, body open and exposed, vulnerable stance, handcuffs visible clearly, restrained and helpless,
        if man present: standing close, dominant position, hand on her face or body, controlling her,
        restrained position, unable to resist, cuffed helpless, submissive bondage, hands bound, vulnerable restraint,
        submissive expression, helpless feeling, bound and vulnerable, at mercy, light bondage submission,
        bedroom or dungeon setting, standing or kneeling restrained, dramatic lighting, shadows, bondage atmosphere, light BDSM scene, full body composition showing restraints,
        photorealistic, 8K UHD, hyperrealistic, handcuffs visible detailed, metal cuffs, restrained, light bondage, submissive, masterpiece""",

    "collar_leash": """score_9, score_8_up, score_7_up,
        1girl, 1boy, collar and leash, pet play, BDSM light, on all fours or kneeling, full body,
        woman on all fours or kneeling, wearing collar around neck, leash attached to collar held by man, pet play scenario, submissive position, collared and leashed,
        beautiful woman, 25 years old, blonde hair in high ponytail, styled for pet play,
        gorgeous face with submissive expression, blue eyes looking up at master, mouth slightly open, tongue maybe out, obedient pet expression, eager to please,
        large natural breasts hanging down, nipples erect, athletic body, collar visible around neck, naked except collar,
        smooth tan skin, realistic texture, maybe marks from collar,
        on all fours or kneeling, leather collar tight around neck visible clearly, leash attached to collar, leash held taut by man, being led or controlled by leash, head pulled up by leash tension, neck extended, pet position, submissive posture, collared like pet,
        dominant man standing or kneeling, holding leash firmly, pulling leash controlling direction, other hand may be on her head, dominant stance, full body visible,
        leash taut showing control, collar tight showing ownership,
        being led on leash, pet play submission, obedient to master, following leash commands, submissive pet, collared and owned,
        eager to please master, obedient pet behavior, submissive to leash, being a good pet, pet play satisfaction,
        bedroom with BDSM elements visible, pet play scene, dramatic lighting, collar and leash prominent, light BDSM atmosphere, full body composition showing pet dynamic,
        photorealistic, 8K UHD, hyperrealistic, collar detailed, leather texture, leash visible, pet play scene, light BDSM, submissive, masterpiece""",

    "blindfolded": """score_9, score_8_up, score_7_up,
        1girl, solo or 1boy, blindfolded, eyes covered, sensory deprivation, BDSM light, full body or close-up,
        woman lying or standing, eyes covered by blindfold, unable to see, body exposed, vulnerable position, sensory play scenario,
        beautiful woman, 24 years old, blonde hair visible around blindfold,
        gorgeous face with blindfold covering eyes, black silk blindfold or fabric, eyes completely hidden, cannot see, mouth visible open slightly, expression vulnerable anticipatory, other senses heightened visible in expression,
        medium perky breasts exposed, nipples erect sensitive, athletic body, skin sensitive to touch,
        smooth fair skin, realistic texture, heightened sensitivity visible,
        lying on back or standing, blindfold securely covering eyes, black silk or cloth over eyes, unable to see surroundings, hands maybe reaching out uncertainly, body exposed vulnerable, cannot see what's coming, sensory deprivation, anticipatory pose,
        if man present: standing close, hand approaching her body, she cannot see, surprise touch,
        heightened other senses, touch anticipated, sound sensitive, vulnerable without sight, sensory play,
        vulnerable without vision, anticipating touch, unable to see, sensory heightened, BDSM sensory play,
        bedroom, lying or standing, dramatic lighting, shadows, blindfolded prominent, sensory play atmosphere, close-up on face or full body composition,
        photorealistic, 8K UHD, hyperrealistic, blindfold detailed, silk texture, eyes covered, sensory deprivation, BDSM light, vulnerable, masterpiece""",

    "spreader_bar": """score_9, score_8_up, score_7_up,
        1girl, solo or 1boy, spreader bar, legs forced apart, leg restraint, BDSM bondage, full body,
        woman lying on back or standing, legs forced wide apart by metal spreader bar, ankles cuffed to bar ends, unable to close legs, extremely vulnerable position, legs spread maximum,
        beautiful woman, 24 years old, blonde hair messy from struggling,
        gorgeous face showing vulnerability, blue eyes wide or closed, mouth open, expression of helpless exposure, cannot close legs, extremely vulnerable,
        medium perky breasts exposed, nipples erect, athletic body, stomach visible,
        smooth tan skin, realistic texture, struggling visible,
        legs forced maximally apart by metal spreader bar, bar between ankles, each ankle cuffed to bar ends, legs spread impossibly wide, cannot close thighs, pussy completely exposed vulnerable, unable to protect self, labia fully visible spread, asshole exposed, spreader bar prominent, legs held wide by restraint,
        if man present: standing between her spread legs, hands on bar or her body, complete access,
        unable to close legs, forced spread maximum, completely exposed, helpless leg restraint, bondage spread,
        extremely vulnerable, forced exposure, cannot close legs, helpless spread, BDSM restraint vulnerability,
        bedroom or dungeon, lying or standing with legs spread, BDSM lighting dramatic, spreader bar visible clearly, bondage atmosphere, full body composition showing forced spread,
        photorealistic, 8K UHD, hyperrealistic, spreader bar detailed, metal bar, legs forced apart, extreme exposure, BDSM bondage, vulnerable, masterpiece""",

    "suspended": """score_9, score_8_up, score_7_up,
        1girl, solo or 1boy, suspended, rope bondage, shibari, hanging, BDSM suspension, full body,
        woman suspended in air by rope bondage, body hanging by ropes, intricate rope patterns around body, shibari harness, suspended from ceiling or frame, feet off ground, helpless hanging,
        beautiful woman, 25 years old, blonde hair hanging down or in ponytail,
        gorgeous face showing vulnerability or pleasure, blue eyes looking down or closed, mouth open, expression of suspended helplessness, trust in bondage,
        large breasts bound by ropes, rope harness around chest, nipples visible between ropes, athletic body tied, stomach visible, rope patterns,
        smooth tan skin with rope marks, realistic texture, rope indentations, slight redness from pressure,
        body suspended in air, hanging by elaborate rope bondage, shibari patterns covering body, ropes wrapped around torso, arms bound, legs bound and spread, intricate rope work, knots visible, red ropes against skin, body weight supported by ropes, feet dangling, completely suspended helpless, artistic bondage,
        if man present: standing near, admiring rope work, hand touching her suspended body,
        hanging helpless, suspended by ropes, weight in bondage, aerial suspension, shibari displayed,
        trust in ropes, suspended vulnerability, beautiful bondage, artistic suspension, BDSM rope play,
        dungeon or bedroom, suspension frame visible, dramatic lighting on rope work, shadows on bound body, shibari prominent, full body suspended composition,
        photorealistic, 8K UHD, hyperrealistic, rope bondage detailed, shibari intricate, suspended body, rope texture, BDSM suspension, artistic, masterpiece""",

    "butt_plug": """score_9, score_8_up, score_7_up,
        1girl, solo, butt plug, anal plug inserted, sex toy, rear view, close-up or full body,
        woman bent over or on all fours, ass raised displaying butt plug, anal toy inserted visible, rear view showing plug, ass presented,
        beautiful woman, 24 years old, blonde hair in ponytail,
        gorgeous face looking back over shoulder, blue eyes showing arousal, mouth open, expression showing fullness, anal pleasure visible,
        medium perky breasts visible from side, athletic body, narrow waist, wide hips prominent,
        smooth tan skin, realistic texture, ass smooth,
        bent over or all fours, ass raised high displaying, butt plug inserted visible clearly, anal plug base visible between ass cheeks, jeweled plug base maybe, metal or silicone visible, ass cheeks spread naturally showing plug, anus stretched around plug base, pussy visible below, toy prominent, anal toy displayed,
        ass presented showing toy, displaying plug, anal toy worn,
        wearing anal plug, feeling fullness, anal toy inside, plug displayed, showing off toy, anal preparation,
        bedroom or studio, bent over or all fours, dramatic lighting on ass, plug visible clearly, toy prominent, rear view composition, close-up on plug or full body,
        photorealistic, 8K UHD, hyperrealistic, butt plug detailed, anal toy visible, plug base clear, ass displayed, sex toy, realistic, masterpiece""",

    "gagged": """score_9, score_8_up, score_7_up,
        1girl, solo or 1boy, gagged, ball gag, mouth gag, BDSM, silenced, close-up or full body,
        woman kneeling or standing, mouth forced open by ball gag, red or black ball between teeth, straps around head, unable to speak, silenced, submissive position,
        beautiful woman, 23 years old, blonde hair messy or ponytail,
        gorgeous face with ball gag in mouth, blue eyes wide or pleading, mouth stretched around ball gag, cannot speak, drool dripping from mouth around gag, muffled noises only, expression submissive helpless, silenced face,
        large perky breasts exposed, nipples erect, athletic body nude, unable to speak or protest,
        smooth tan skin, realistic texture, drool on chin,
        kneeling or standing, ball gag forced between teeth, mouth opened by ball, gag straps around head behind neck, buckle visible, unable to close mouth, drool flowing from corners of mouth, saliva dripping down chin to breasts, muffled sounds only, cannot speak clearly, silenced by gag, ball gag prominent,
        if man present: standing close, hand on gagged face, enjoying her silence,
        muffled noises, unable to speak, silenced by gag, drooling around ball, submissive gagged,
        silenced and helpless, cannot protest, muffled submission, gagged vulnerability, BDSM silence,
        bedroom or dungeon, kneeling or standing, dramatic lighting, ball gag visible clearly, drool visible, BDSM atmosphere, close-up on gagged face or full body composition,
        photorealistic, 8K UHD, hyperrealistic, ball gag detailed, red/black ball, drool realistic, gagged, BDSM, muffled, masterpiece""",

    
    # ============================================
    # GROUP CATEGORY
    # ============================================
    "gangbang": """score_9, score_8_up, score_7_up,
        1girl, multiple boys, gangbang, group sex, multiple partners, surrounded, full body,
        woman in center surrounded by multiple men, being fucked by multiple cocks simultaneously, group sex intense, surrounded and filled, multiple penetration, gangbang position,
        beautiful woman, 24 years old, blonde hair messy wild from intense sex,
        gorgeous face showing overwhelming pleasure, blue eyes glazed or rolled back, mouth open wide, expression overwhelmed, taking multiple cocks, face flushed,
        large breasts being groped by multiple hands, nipples pinched, body being used everywhere, athletic form surrounded,
        tan skin glistening sweat, covered in sweat and maybe cum, realistic used texture,
        surrounded by men, multiple cocks penetrating simultaneously, cock in pussy, cock in mouth, cocks in hands, multiple penetrations at once, men surrounding her body, hands everywhere groping, bodies pressing against her from all sides, overwhelmed by multiple men, gangbang circle, group fucking,
        multiple men visible, muscular bodies surrounding her, hands gripping her, cocks everywhere, some waiting their turn, group dynamic visible,
        multiple penises visible, some penetrating, others being stroked, cocks everywhere around her, erect dicks surrounding,
        being fucked by multiple men simultaneously, gangbang intensity, group fucking, multiple cocks filling, being used by group, overwhelmed by numbers,
        completely overwhelmed, taking multiple at once, surrounded by cock, group use, gangbang intensity, shared by many,
        bedroom or group setting, men surrounding, multiple bodies visible, group scene, dramatic lighting, chaotic group composition, full scene visible,
        photorealistic, 8K UHD, hyperrealistic, multiple people, group sex, gangbang scene, intense, crowded composition, masterpiece""",

    "double_penetration": """score_9, score_8_up, score_7_up,
        1girl, 2boys, double penetration, DP, pussy and ass filled, both holes, extreme, full body or close-up,
        woman sandwiched between two men, one cock in pussy, one cock in ass, both holes penetrated simultaneously, double stuffed position, extreme penetration,
        beautiful woman, 26 years old, blonde hair wild messy,
        gorgeous face showing extreme sensation, blue eyes wide or rolled back, mouth gaped open, expression of overwhelming fullness, taking two cocks, completely filled, face showing intensity,
        large breasts pressed, nipples visible, body stretched and filled, athletic form taking both,
        tan skin glistening, sweating profusely, realistic stretched texture,
        sandwiched between men, cock penetrating pussy visible, cock penetrating ass visible, both holes filled simultaneously, double penetration clear, labia stretched around one cock, anus stretched around other cock, both shafts visible penetrating, completely filled and stretched, double stuffed, extreme fullness,
        two men visible, one behind, one in front, man behind penetrating ass, man in front penetrating pussy, both thrusting, coordinated double fucking,
        two thick penises visible, one in pussy, one in ass, both shafts buried, cocks visible entering different holes, double penetration clear,
        both holes being fucked, synchronized thrusting, double penetration intensity, completely filled by two, being DP'd, taking both cocks,
        overwhelmed by double penetration, extreme fullness, taking two at once, DP intensity, both holes filled, complete penetration,
        bedroom, sandwiched between men, both men visible, DP clear, dramatic lighting showing penetration, extreme composition, close-up on double penetration or full threesome,
        photorealistic, 8K UHD, hyperrealistic, both cocks visible, pussy and ass penetrated, DP detailed, extreme penetration, realistic, masterpiece""",

    "mfm_threesome": """score_9, score_8_up, score_7_up,
        1girl, 2boys, MFM threesome, two men one woman, shared, full body,
        woman with two men, one cock in mouth, one cock in pussy, spit-roasted position or other threesome configuration, servicing two men simultaneously,
        beautiful woman, 25 years old, blonde hair in ponytail or loose,
        gorgeous face with cock in mouth, blue eyes looking up, cheeks bulging, expression focused on two tasks, pleasuring two men simultaneously,
        large breasts hanging or bouncing, nipples visible, athletic body being shared, multiple hands on body,
        smooth tan skin, realistic texture, being touched by two sets of hands,
        cock in mouth sucking, pussy being penetrated by other cock, two cocks being serviced simultaneously, mouth full, pussy filled, spit-roasted or other MFM position, hands on both men, pleasuring two partners at once, mouth and pussy both filled,
        two men visible, one at face, one at pussy, man in front getting sucked, man behind fucking, both receiving pleasure, coordinated threesome,
        two penises visible, one in mouth, one in pussy, both cocks being pleasured, shafts visible,
        sucking one while being fucked by other, pleasuring two men, MFM threesome, servicing both simultaneously, two at once,
        shared between two men, pleasuring both partners, MFM satisfaction, being desired by two, threesome intensity,
        bedroom, threesome visible, two men positioned, MFM clear, dramatic lighting on three, full scene composition showing all three,
        photorealistic, 8K UHD, hyperrealistic, MFM threesome, two cocks visible, three people, realistic, detailed, masterpiece""",

    "lesbian_sex": """score_9, score_8_up, score_7_up,
        2girls, lesbian, lesbian sex, two women, girl on girl, mutual pleasure, full body,
        two women together on bed, bodies intertwined, intimate lesbian position, tribbing or other lesbian sex position, naked together, mutual intimacy,
        two beautiful women, both 25 years old, blonde and brunette, hair loose flowing,
        gorgeous faces close together or pleasuring each other, passionate expressions, eye contact maybe, kissing maybe, focused on each other,
        large breasts on both women, breasts pressed together, nipples touching or erect, athletic bodies both, curves together,
        smooth skin on both, tan and fair skin together, realistic textures touching,
        bodies pressed together naked, breasts against breasts, pussy against pussy tribbing, or one eating other out, scissoring legs intertwined, or fingers inside each other, mutual lesbian pleasure, intimate girl-on-girl contact, bodies aligned, hands exploring female bodies, lesbian intimacy,
        two women pleasuring each other, hands on breasts or between legs, touching female bodies, mutual female pleasure, lesbian passion,
        mutual pleasure, exploring each other, lesbian passion, girl-on-girl intimacy, female-female connection, shared pleasure,
        lesbian connection, emotional and physical, mutual satisfaction, female intimacy, girl-girl passion, women together,
        bedroom, bed, two women visible together, lesbian scene, warm romantic lighting, soft focus, intimate lesbian composition, full bodies together,
        photorealistic, 8K UHD, hyperrealistic, two women, lesbian, girl-on-girl, realistic, intimate, romantic, masterpiece""",

    "scissoring": """score_9, score_8_up, score_7_up,
        2girls, lesbian, scissoring, tribadism, grinding pussies, legs intertwined, full body,
        two women scissoring, bodies at angle, legs spread and interlocked, pussies pressed together, grinding on each other, tribbing position, legs forming X shape,
        two beautiful women, both 26 years old, blonde and brunette, hair flowing,
        gorgeous faces showing pleasure, eyes looking at each other or closed, mouths open moaning, expressions mutual pleasure, focused on sensation,
        large breasts bouncing on both, nipples erect on both, athletic bodies both, legs powerful and intertwined,
        smooth skin on both, sweating together, realistic skin contact texture,
        legs spread wide interlocked forming X, right leg under left leg scissoring, pussies pressed together grinding, labia lips touching, clits rubbing, wetness mixing, grinding motion, tribbing rhythm, pussy-to-pussy contact, scissor position clear, intimate genital contact, mutual grinding,
        both women's hands supporting body or on each other, bodies balanced in scissor, synchronized grinding motion,
        pussies grinding together, clits rubbing, mutual friction, tribbing motion, scissoring rhythm, both pleasuring each other simultaneously,
        mutual grinding pleasure, lesbian scissoring, tribbing satisfaction, pussy contact pleasure, synchronized lesbian grinding, both building to orgasm,
        bedroom, bed, two women scissoring visible, legs intertwined clear, dramatic lighting on bodies, lesbian atmosphere, full body composition showing scissor position,
        photorealistic, 8K UHD, hyperrealistic, scissoring detailed, legs intertwined, pussies together, tribbing visible, lesbian sex, realistic, masterpiece""",

    "lesbian_oral": """score_9, score_8_up, score_7_up,
        2girls, lesbian, lesbian oral, eating pussy, cunnilingus, one giving oral, full body,
        two women on bed, one lying back receiving, one between legs giving oral, lesbian oral sex, girl eating girl, intimate lesbian position,
        two beautiful women, both 24 years old, blonde woman receiving, brunette woman giving,
        receiving woman's gorgeous face showing pleasure, eyes closed, mouth open moaning, lying back receiving,
        giving woman's face between legs, focused on pussy, tongue visible on clit, eating out,
        large breasts on both women, receiving woman's breasts visible, nipples erect, giving woman's breasts hanging, both athletic bodies,
        smooth skin on both, realistic textures,
        receiving woman lying back, legs spread wide, thighs around giver's head, pussy being eaten,
        giving woman lying on stomach between legs, face buried in pussy, tongue licking labia, eating clit, hands on inner thighs, focused on oral,
        tongue on pussy, licking motion, oral lesbian pleasure, eating out, face in pussy, lesbian cunnilingus,
        receiving oral pleasure, moaning from female tongue, giving oral pleasure to woman, lesbian oral satisfaction, girl-on-girl oral,
        bedroom, bed, two women visible, one giving oral to other, lesbian oral scene, intimate lighting, soft focus, full body composition showing oral position,
        photorealistic, 8K UHD, hyperrealistic, lesbian oral visible, tongue on pussy, eating out, girl-on-girl, intimate, masterpiece""",


    # ============================================
    # MISC / COMMUNITY CATEGORY
    # ============================================
    "standing": """score_9, score_8_up, score_7_up,
        1girl, solo, standing, confident pose, nude, full body front view,
        woman standing confidently, body upright, legs slightly apart, arms at sides or one hand on hip, standing nude, displaying body, neutral standing position,
        stunning woman, 25 years old, blonde hair in ponytail or loose flowing,
        gorgeous face with confident expression, blue eyes looking directly at camera, slight smile or neutral, strong eye contact, confident demeanor,
        large perky breasts standing, nipples erect, athletic toned body, flat stomach, narrow waist, wide hips, toned legs, full front body displayed,
        smooth tan skin, realistic detailed texture with pores, natural body, realistic proportions,
        standing straight, legs slightly apart stable stance, arms relaxed at sides or hand on hip, confident posture, full nude body displayed, breasts natural position standing, pussy visible between legs from front, entire body shown, comfortable nude standing,
        standing alone, displaying confidence, comfortable in nudity, strong standing presence, owning space,
        confident in body, comfortable nude, displaying self, standing proud, empowered standing,
        studio or bedroom, neutral standing background, even lighting on full body, soft shadows, full front body composition, standing portrait,
        photorealistic, 8K UHD, hyperrealistic, full body standing, realistic proportions, detailed skin, natural standing, confident, masterpiece""",

    "spread_legs_sitting": """score_9, score_8_up, score_7_up,
        1girl, solo, sitting, spread legs, legs apart, explicit view, seductive, full body,
        woman sitting on bed or chair, legs spread maximally wide, knees bent or straight, thighs apart, sitting exposed, inviting position,
        beautiful woman, 24 years old, blonde hair loose or in ponytail,
        gorgeous face with seductive expression, blue eyes looking at camera inviting, mouth slightly open, sensual expression, beckoning gaze,
        large perky breasts visible, nipples erect, athletic body, flat stomach, sitting posture,
        smooth tan skin, realistic texture, light sheen,
        sitting with legs spread wide apart, thighs maximally open, knees bent up or legs extended, pussy fully visible exposed between legs, labia visible, vaginal opening shown, clitoris visible, completely exposed sitting, inviting spread, sitting explicit view, legs apart displaying,
        hands may be on knees spreading wider or on bed behind supporting, body leaning back presenting,
        spreading legs invitingly, displaying pussy while sitting, explicit sitting exposure, offering view, presenting while seated,
        seductive seated invitation, sitting exposed, inviting approach, displaying seated, offering seated access,
        bedroom or studio, sitting on bed or chair, spread legs clear, dramatic lighting on exposed pussy, seductive atmosphere, full body sitting composition,
        photorealistic, 8K UHD, hyperrealistic, sitting spread detailed, pussy visible, explicit sitting pose, seductive, realistic, masterpiece""",

    "bent_over_solo": """score_9, score_8_up, score_7_up,
        1girl, solo, bent over, touching toes, ass up, rear view, solo tease, full body,
        woman standing bent over forward, hands reaching toward toes or floor, back arched, ass raised high, rear prominent, teasing position, looking back,
        beautiful woman, 25 years old, blonde hair in ponytail or hanging down,
        gorgeous face looking back over shoulder, blue eyes teasing, playful smile, seductive glance back,
        medium perky breasts hanging visible from side, athletic body bent, narrow waist emphasized, round prominent ass raised,
        smooth tan skin, realistic texture,
        standing bent over forward, hands near toes or on legs, back deeply arched, ass raised high prominent, rear displayed, pussy visible from behind between thighs, asshole visible from rear, legs straight or slightly bent, bent over presenting rear, ass up teasing position,
        looking back at camera over shoulder, teasing with bent over position, presenting ass,
        teasing with bent over pose, presenting ass invitingly, looking back seductively, bent over tease, offering rear view,
        playful teasing, bent over invitation, presenting rear, ass up seductive, solo rear tease,
        bedroom or studio, standing bent over, rear view prominent, dramatic lighting on curves, teasing atmosphere, full body bent composition,
        photorealistic, 8K UHD, hyperrealistic, bent over detailed, ass prominent, rear view, teasing pose, realistic, masterpiece""",

    "jack_o_pose": """score_9, score_8_up, score_7_up,
        1girl, solo, jack-o pose, face down ass up, extreme arch, yoga position, full body rear view,
        woman in extreme jack-o challenge pose, face and chest on floor, ass raised maximally high, back arched to maximum, extreme flexibility pose, rear prominent, legs spread,
        beautiful woman, 24 years old, blonde hair visible from rear,
        face down on floor or visible from side, expression flexible achievement, rear view focus,
        breasts pressed against floor or visible from side, athletic extremely flexible body, extreme arch,
        smooth tan skin, realistic texture, flexibility evident,
        jack-o challenge position, chest and face flat on floor, arms extended forward or beside, back arched to extreme degree, ass raised maximally high in air, legs spread slightly, pussy visible from behind, asshole visible prominent, extreme arch flexibility, rear displayed maximum, athletic flexibility displayed,
        holding extreme position, demonstrating flexibility, maintaining arch, displaying rear extremely,
        showing off flexibility, extreme arch achievement, athletic flexibility display, jack-o challenge, impressive position,
        bedroom or studio, floor, extreme arch visible, dramatic lighting on arch and rear, flexibility impressive, full body rear view composition showing extreme position,
        photorealistic, 8K UHD, hyperrealistic, extreme flexibility, jack-o pose detailed, ass raised high, athletic, impressive, masterpiece""",

    "yoga_pose": """score_9, score_8_up, score_7_up,
        1girl, solo, yoga pose, downward dog, flexible, nude yoga, full body,
        woman in downward dog yoga position, hands and feet on floor, body forming inverted V, hips raised high, head down, nude yoga position, athletic flexibility,
        beautiful woman, 25 years old, blonde hair in ponytail or bun,
        gorgeous face looking back between legs maybe, blue eyes focused, expression concentrated or peaceful, yoga focused,
        medium perky breasts hanging down from position, nipples erect, athletic flexible body, toned muscles visible, yoga physique,
        smooth tan skin, light sweat from workout, realistic texture, healthy glow,
        downward dog position, hands flat on floor shoulder-width, feet flat on floor hip-width, hips raised high forming peak, ass prominent raised, back straight or slightly arched, head between arms hanging, legs straight or slightly bent, hamstrings stretched, pussy visible from behind, yoga nude flexibility,
        holding yoga position, maintaining form, breathing steady, demonstrating flexibility, athletic pose,
        yoga practice nude, flexible strength, athletic pose, demonstrating yoga, peaceful flexibility,
        home yoga studio or bedroom, yoga mat, natural lighting, peaceful atmosphere, athletic pose, full body yoga composition,
        photorealistic, 8K UHD, hyperrealistic, yoga pose detailed, athletic flexibility, nude yoga, healthy, peaceful, masterpiece""",

    "showering_solo": """score_9, score_8_up, score_7_up,
        1girl, solo, showering, water running, wet body, nude wet, full body,
        woman standing in shower, water cascading over body from above, completely wet, showering naked, water streaming down, standing under water flow,
        stunning woman, 26 years old, blonde hair completely soaked, wet hair slicked back or hanging heavy with water,
        gorgeous wet face, blue eyes open or closed, water running over face, mouth slightly open, wet expression, natural wet beauty,
        large natural breasts wet, water streaming over breasts, nipples erect from water, athletic body completely wet, water running down every curve,
        wet tan skin glistening, water droplets everywhere, completely soaked realistic texture, wet skin natural,
        standing in shower, arms raised maybe washing hair or running through wet hair, body turned slightly maybe, water pouring from showerhead above, water cascading down entire body, streams running down breasts, stomach, legs, soaking wet all over, water pooling at feet, steam surrounding maybe,
        washing self, enjoying warm water, water flowing over body, standing under stream, shower relaxation,
        relaxing in shower, warm water pleasure, washing sensually, enjoying shower, water sensations, peaceful showering,
        bathroom shower, glass shower enclosure maybe, water streaming, steam visible, wet environment, warm lighting, full body wet composition,
        photorealistic, 8K UHD, hyperrealistic, water detailed, wet skin realistic, shower environment, water streams, natural wet, masterpiece""",

    "bath": """score_9, score_8_up, score_7_up,
        1girl, solo, bathing, in bathtub, bubbles, relaxed, full body,
        woman relaxing in bathtub, body submerged in water, bubbles covering partially, arms resting on tub sides or playing with bubbles, comfortable bath position,
        beautiful woman, 27 years old, brown hair up in messy bun with loose strands,
        gorgeous face relaxed, brown eyes peaceful, slight smile, serene expression, enjoying bath, natural beauty,
        medium natural breasts partially visible above water, bubble covered maybe, nipples maybe visible, soft feminine body, relaxed curves,
        smooth fair skin, wet skin above water, natural skin, healthy glow,
        sitting or reclining in bathtub, body submerged in warm water, bubbles covering body surface, legs visible maybe bent knees above water, arms resting on tub edge, breasts partially submerged or above water with bubbles, body relaxed in water, comfortable bath position, surrounded by bubbles and water,
        relaxing in bath, enjoying warm water, playing with bubbles maybe, peaceful bathing, comfortable soak,
        peaceful bath relaxation, enjoying warm bath, serene moment, bath time pleasure, comfortable soaking,
        luxury bathroom, large bathtub, candles maybe, bubbles prominent, warm lighting, golden glow, peaceful atmosphere, full bath composition,
        photorealistic, 8K UHD, hyperrealistic, bath realistic, bubbles detailed, wet skin, peaceful lighting, serene, cozy, masterpiece""",
}

# ============================================
# NEGATIVE PROMPT
# ============================================
NEGATIVE_PROMPT = """score_6, score_5, score_4,
(worst quality:1.4), (low quality:1.4), (normal quality:1.2),
lowres, bad anatomy, bad hands, bad fingers, extra fingers, missing fingers,
ugly, deformed, disfigured, mutated, malformed,
anime, cartoon, drawing, painting, sketch, illustration, 3d render, cgi,
plastic skin, doll, mannequin, fake, artificial,
blurry, out of focus, grainy, noisy, pixelated,
watermark, text, signature, logo,
oversaturated, overexposed, underexposed,
extra limbs, missing limbs, bad proportions,
child, minor, underage, young"""

# ============================================
# CHARACTER PARSER
# ============================================
def parse_character_features(character: CharacterData) -> dict:
    # Extract hair color
    hair_colors = ['blonde', 'brunette', 'red', 'black', 'brown', 'white']
    hair_color = None
    for color in hair_colors:
        if color in character.description.lower():
            hair_color = color
            break
    
    # Get hair style
    hair_style = None
    if character.hairStyle:
        hair_style = character.hairStyle.lower()
    elif character.physicalAttributesId and character.physicalAttributesId.hairStyle:
        hair_style = character.physicalAttributesId.hairStyle.lower()
    
    # Build hair
    if hair_style and hair_style in ["ponytail", "bun", "braided"]:
        hair = f"{hair_color or 'long'} hair in {hair_style}"
    else:
        hair = f"{hair_color or 'long'} {hair_style or ''} hair".strip()
    
    # Eyes
    eye_color = (character.eyeColor or 
                (character.physicalAttributesId.eyeColor if character.physicalAttributesId else None) or 
                "blue")
    eyes = f"{eye_color.lower()} eyes"
    
    # Body
    body = "athletic toned"
    
    # Breasts
    breast_size = (character.breastSize or 
                  (character.physicalAttributesId.breastSize if character.physicalAttributesId else None) or 
                  "Large")
    breast_map = {
        "small": "small perky breasts",
        "medium": "medium natural breasts",
        "large": "large perky natural breasts",
        "extra-large": "extremely large natural breasts"
    }
    breasts = breast_map.get(breast_size.lower(), "large perky natural breasts")
    
    # Butt
    butt_size = (character.buttSize or 
                (character.physicalAttributesId.buttSize if character.physicalAttributesId else None) or 
                "Medium")
    butt_map = {
        "small": "small firm butt",
        "medium": "round bubble butt",
        "large": "large round ass",
        "extra-large": "huge bubble butt"
    }
    butt = butt_map.get(butt_size.lower(), "round bubble butt")
    
    # Skin
    ethnicity = (character.ethnicity or 
                (character.physicalAttributesId.ethnicity if character.physicalAttributesId else None) or 
                "white")
    skin_map = {
        "white": "smooth fair skin",
        "black": "smooth dark skin",
        "asian": "smooth fair skin",
        "latina": "smooth tan skin",
        "arab": "smooth tan skin"
    }
    skin = skin_map.get(ethnicity.lower(), "smooth tan skin")
    
    return {
        "name": character.name,
        "age": character.age,
        "hair": hair,
        "eyes": eyes,
        "body": body,
        "breasts": breasts,
        "butt": butt,
        "skin": skin
    }

def get_pose_name(character: CharacterData, override_pose: Optional[str]) -> str:
    """Get pose name from character personalityId.poseId or override"""
    
    pose_name = None
    
    if override_pose:
        pose_name = override_pose
    # Get poseId from personalityId
    elif character.personalityId and character.personalityId.poseId:
        pose_id = character.personalityId.poseId
        
        # Map pose ID to pose name
        if pose_id in POSE_ID_MAP:
            pose_name = POSE_ID_MAP[pose_id]
        else:
            # If not in map, use the poseId directly
            pose_name = pose_id
    
    # Normalize pose name: convert to lowercase and replace spaces with underscores
    if pose_name:
        pose_name = pose_name.lower().replace(' ', '_').replace('-', '_')
    else:
        pose_name = "standing"
    
    return pose_name

def get_occupation_name(character: CharacterData) -> str:
    """Get occupation name from personalityId.occupationId"""
    
    print(f"\n🔍 DEBUG get_occupation_name:")
    print(f"   character.personalityId: {character.personalityId}")
    
    if character.personalityId:
        print(f"   character.personalityId.occupationId: {character.personalityId.occupationId}")
    
    if character.personalityId and character.personalityId.occupationId:
        occ_value = character.personalityId.occupationId
        
        print(f"   occ_value: '{occ_value}'")
        print(f"   occ_value type: {type(occ_value)}")
        
        # Check if it's an ID in the map
        if occ_value in OCCUPATION_ID_MAP:
            print(f"   ✅ Found in OCCUPATION_ID_MAP: {OCCUPATION_ID_MAP[occ_value]}")
            return OCCUPATION_ID_MAP[occ_value]
        
        # Otherwise, treat it as the occupation name directly
        # Check if it exists in OCCUPATION_SETTINGS
        if occ_value in OCCUPATION_SETTINGS:
            print(f"   ✅ Found in OCCUPATION_SETTINGS: {occ_value}")
            return occ_value
        
        # If not found, try to find a case-insensitive match
        for occ_name in OCCUPATION_SETTINGS.keys():
            if occ_name.lower() == occ_value.lower():
                print(f"   ✅ Found case-insensitive match: {occ_name}")
                return occ_name
        
        print(f"   ❌ Not found in any mapping, returning 'None'")
    else:
        print(f"   ❌ No personalityId or occupationId, returning 'None'")
    
    return "None"

def build_custom_prompt(character: CharacterData, pose_name: str, base_prompt: str, occupation: str) -> str:
    """Build custom prompt"""
    
    features = parse_character_features(character)
    occ_setting = OCCUPATION_SETTINGS.get(occupation, OCCUPATION_SETTINGS["None"])
    
    print(f"\n🔍 DEBUG build_custom_prompt:")
    print(f"   Character features: {features}")
    print(f"   Occupation: {occupation}")
    print(f"   Occupation settings: {occ_setting}")
    
    custom_prompt = base_prompt
    
    # Replace age (e.g., "24 years old" -> "21 years old")
    custom_prompt = re.sub(r'\b\d{2}\s+years old\b', f"{features['age']} years old", custom_prompt)
    
    # Replace hair (more comprehensive patterns)
    # Match patterns like "long blonde hair in high ponytail", "blonde hair", etc.
    hair_patterns = [
        r'long blonde hair in high ponytail whipping around, hair flowing with motion',
        r'long blonde hair in high ponytail swaying with motion',
        r'long blonde hair in ponytail cascading down back swaying with motion',
        r'long blonde hair in high ponytail',
        r'long flowing blonde hair fanned out on pillow',
        r'long blonde hair spread out',
        r'blonde hair in ponytail or loose flowing',
        r'long [\w\s]+ hair',
        r'blonde hair',
    ]
    for pattern in hair_patterns:
        custom_prompt = re.sub(pattern, features['hair'], custom_prompt, flags=re.IGNORECASE)
    
    # Replace eyes
    custom_prompt = re.sub(r'(?:piercing |bright |gorgeous )?(?:blue|brown|green|hazel|amber) eyes', features['eyes'], custom_prompt, flags=re.IGNORECASE)
    
    # Replace breasts
    custom_prompt = re.sub(r'(?:small|medium|large|extremely large)(?: perky)?(?: natural)? breasts', features['breasts'], custom_prompt, flags=re.IGNORECASE)
    
    # Replace butt
    custom_prompt = re.sub(r'(?:small firm|round|round firm|round bubble|large round|huge bubble) butt', features['butt'], custom_prompt, flags=re.IGNORECASE)
    custom_prompt = re.sub(r'(?:round|large round) ass', features['butt'].replace('butt', 'ass'), custom_prompt, flags=re.IGNORECASE)
    
    # Replace skin (more comprehensive)
    skin_patterns = [
        r'flawless smooth tan skin',
        r'smooth tan skin',
        r'smooth fair skin',
        r'smooth dark skin',
        r'(?:smooth |realistic |flawless )?(?:tan|fair|dark) skin',
    ]
    for pattern in skin_patterns:
        custom_prompt = re.sub(pattern, features['skin'], custom_prompt, flags=re.IGNORECASE)
    
    # Replace setting with occupation
    custom_prompt = re.sub(r'luxury master bedroom setting.*?full body shot composition', 
                          f"{occ_setting['background']}, {occ_setting['props']}, {occ_setting['lighting']}, full body shot composition",
                          custom_prompt, flags=re.IGNORECASE)
    
    # Also handle other bedroom variations
    custom_prompt = re.sub(r'bedroom setting, rumpled sheets, warm lighting', 
                          f"{occ_setting['background']}, {occ_setting['props']}, {occ_setting['lighting']}",
                          custom_prompt, flags=re.IGNORECASE)
    custom_prompt = re.sub(r'luxury bedroom, silk sheets underneath, soft romantic lighting, golden glow, intimate atmosphere', 
                          f"{occ_setting['background']}, {occ_setting['props']}, {occ_setting['lighting']}, intimate atmosphere",
                          custom_prompt, flags=re.IGNORECASE)
    
    print(f"   ✅ Prompt customization complete\n")
    
    return custom_prompt

# ============================================
# POST-PROCESSING
# ============================================
def enhance_image(image: Image.Image) -> Image.Image:
    image = image.filter(ImageFilter.UnsharpMask(radius=1.5, percent=100, threshold=3))
    enhancer = ImageEnhance.Contrast(image)
    image = enhancer.enhance(1.08)
    enhancer = ImageEnhance.Color(image)
    image = enhancer.enhance(1.03)
    enhancer = ImageEnhance.Sharpness(image)
    image = enhancer.enhance(1.1)
    return image

# ============================================
# GENERATION FUNCTION
# ============================================
def generate_image(character: CharacterData, pose_name: str, quality: str, seed: Optional[int], use_highres: bool, enhance: bool):
    """Generate image"""
    
    # Use fallback prompt if pose not in PROMPTS dictionary
    if pose_name not in PROMPTS:
        print(f"⚠️ Pose '{pose_name}' not in PROMPTS dictionary, using fallback prompt")
        # Use standing pose as base and customize with pose name
        base_prompt = PROMPTS.get("standing", "")
        # Replace "standing" with the actual pose name in the prompt
        base_prompt = base_prompt.replace("standing", pose_name.replace('_', ' '))
        base_prompt = base_prompt.replace("Standing", pose_name.replace('_', ' ').title())
    else:
        base_prompt = PROMPTS[pose_name]
    occupation = get_occupation_name(character)
    final_prompt = build_custom_prompt(character, pose_name, base_prompt, occupation)
    
    preset = QUALITY_PRESETS[quality]
    
    if seed is None:
        seed = torch.randint(0, 2**32, (1,)).item()
    
    generator = torch.Generator(device="cuda").manual_seed(seed)
    
    print(f"\n{'='*70}")
    print(f"🎨 {character.name} - {pose_name}")
    print(f"   Occupation: {occupation}")
    print(f"{'='*70}")
    
    start = time.time()
    model, model_img2img = load_models()
    
    # Base generation
    print("\n📸 Base...")
    image = model(
        prompt=final_prompt,
        negative_prompt=NEGATIVE_PROMPT,
        width=preset['base_width'],
        height=preset['base_height'],
        num_inference_steps=preset['steps'],
        guidance_scale=preset['cfg'],
        generator=generator,
        clip_skip=2,
    ).images[0]
    
    # Highres
    if use_highres:
        print("🔍 Highres...")
        final_w = int(preset['base_width'] * preset['highres_scale'])
        final_h = int(preset['base_height'] * preset['highres_scale'])
        
        upscaled = image.resize((final_w, final_h), Image.LANCZOS)
        generator = torch.Generator(device="cuda").manual_seed(seed + 1)
        
        image = model_img2img(
            prompt=final_prompt,
            negative_prompt=NEGATIVE_PROMPT,
            image=upscaled,
            strength=preset['highres_denoise'],
            num_inference_steps=preset['highres_steps'],
            guidance_scale=preset['cfg'],
            generator=generator,
        ).images[0]
    else:
        final_w, final_h = preset['base_width'], preset['base_height']
    
    # Enhance
    if enhance:
        print("🎨 Enhance...")
        image = enhance_image(image)
    
    gen_time = time.time() - start
    
    print(f"\n✅ Done: {final_w}x{final_h} in {gen_time:.1f}s\n")
    
    return image, seed, gen_time, final_w, final_h, occupation

# ============================================
# API ENDPOINTS
# ============================================
@app.get("/")
async def root():
    return {
        "status": "online",
        "version": "4.0.0",
        "total_poses": len(PROMPTS),
        "total_occupations": len(OCCUPATION_SETTINGS)
    }

@app.get("/poses")
async def get_poses():
    return {"total": len(PROMPTS), "poses": list(PROMPTS.keys())}

@app.get("/occupations")
async def get_occupations():
    return {"total": len(OCCUPATION_SETTINGS), "occupations": list(OCCUPATION_SETTINGS.keys())}

@app.post("/generate", response_model=GenerateResponse)
async def generate(request: GenerateRequest):
    try:
        pose_name = get_pose_name(request.character, request.pose_name)
        
        image, seed, gen_time, width, height, occupation = generate_image(
            character=request.character,
            pose_name=pose_name,
            quality=request.quality,
            seed=request.seed,
            use_highres=request.use_highres,
            enhance=request.enhance
        )
        
        # Convert to base64
        buffered = BytesIO()
        image.save(buffered, format="PNG", quality=98)
        img_base64 = base64.b64encode(buffered.getvalue()).decode()
        
        return GenerateResponse(
            success=True,
            image_base64=img_base64,
            character_name=request.character.name,
            pose=pose_name,
            occupation=occupation,
            quality=request.quality,
            resolution=f"{width}x{height}",
            generation_time=f"{gen_time:.2f}s",
            seed=seed
        )
    
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "gpu": torch.cuda.is_available(),
        "model_loaded": pipe is not None
    }

@app.on_event("startup")
async def startup():
    print("\n" + "="*80)
    print("🚀 NSFW IMAGE GENERATOR API")
    print("="*80)
    print(f"✅ {len(PROMPTS)} poses loaded")
    print(f"✅ {len(OCCUPATION_SETTINGS)} occupations loaded")
    print("="*80 + "\n")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
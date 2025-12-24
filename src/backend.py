#!/usr/bin/env python3
"""
LUSTIFY FastAPI Server
Uses FULL pose prompt from API
"""
import os
os.environ['HF_HUB_ENABLE_HF_TRANSFER'] = '0'

from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any
import torch
import base64
from io import BytesIO
from diffusers import StableDiffusionXLPipeline, DPMSolverMultistepScheduler, AutoencoderKL
import time

# ============================================
# FASTAPI APP
# ============================================
app = FastAPI(
    title="LUSTIFY Image Generator",
    description="Ultra-HD Realistic NSFW Image Generation API",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================
# GLOBAL MODEL
# ============================================
MODEL_PATH = "/workspace/lustify_v7_ggwp.safetensors"
pipe = None

def load_model():
    """Load LUSTIFY model once at startup"""
    global pipe
    
    if pipe is not None:
        return pipe
    
    print("🔥 Loading LUSTIFY model...")
    
    # Enhanced VAE for better quality
    vae = AutoencoderKL.from_pretrained(
        "madebyollin/sdxl-vae-fp16-fix",
        torch_dtype=torch.float16
    )
    
    pipe = StableDiffusionXLPipeline.from_single_file(
        MODEL_PATH,
        torch_dtype=torch.float16,
        use_safetensors=True,
        vae=vae
    )
    
    # DPM++ 2M SDE Karras (LUSTIFY official)
    pipe.scheduler = DPMSolverMultistepScheduler.from_config(
        pipe.scheduler.config,
        use_karras_sigmas=True,
        algorithm_type="sde-dpmsolver++",
        solver_order=2
    )
    
    pipe = pipe.to("cuda")
    pipe.enable_vae_slicing()
    pipe.enable_vae_tiling()
    
    try:
        pipe.enable_xformers_memory_efficient_attention()
        print("✅ xformers enabled")
    except:
        pass
    
    print("✅ LUSTIFY model loaded!")
    return pipe

# ============================================
# PYDANTIC MODELS
# ============================================
class OccupationData(BaseModel):
    name: Optional[str] = None
    emoji: Optional[str] = None

class HobbyData(BaseModel):
    name: Optional[str] = None
    emoji: Optional[str] = None

class FetishData(BaseModel):
    name: Optional[str] = None
    emoji: Optional[str] = None

class PoseData(BaseModel):
    name: str
    category: str
    prompt: str  # FULL POSE PROMPT FROM API
    emoji: Optional[str] = None

class PersonalityData(BaseModel):
    personality: Optional[str] = None
    personalityDetails: Optional[str] = None
    voice: Optional[str] = None
    occupationId: Optional[OccupationData] = None
    hobbyId: Optional[HobbyData] = None
    fetishId: Optional[FetishData] = None
    poseId: Optional[PoseData] = None

class CharacterData(BaseModel):
    name: str
    age: int
    gender: str
    description: str
    shortDescription: Optional[str] = None
    personalityId: Optional[PersonalityData] = None

class GenerateRequest(BaseModel):
    character_data: CharacterData
    quality: Optional[str] = "hq"  # "standard", "hq", "ultra"
    width: Optional[int] = None
    height: Optional[int] = None

# ============================================
# PARSE CHARACTER
# ============================================
def parse_character(data: CharacterData) -> Dict[str, str]:
    """Extract character details from API data"""
    
    name = data.name
    age = data.age
    description = data.description.lower()
    
    # Extract features from description
    hair_color = "blonde hair" if "blonde" in description else "brown hair"
    if "red hair" in description or "ginger" in description:
        hair_color = "red hair, ginger hair"
    elif "black hair" in description:
        hair_color = "black hair"
    
    hair_style = "braided hair, long braided hair" if "braid" in description else "long hair"
    if "wavy" in description:
        hair_style = "long wavy hair"
    elif "straight" in description:
        hair_style = "long straight hair"
    
    eye_color = "blue eyes" if "blue eyes" in description else "brown eyes"
    if "green eyes" in description:
        eye_color = "green eyes"
    elif "amber eyes" in description or "yellow eyes" in description:
        eye_color = "amber eyes, yellow eyes"
    
    # Skin tone
    if "white" in description or "caucasian" in description:
        skin_tone = "fair skin, pale skin, light skin"
    elif "asian" in description:
        skin_tone = "light skin, asian skin"
    elif "latina" in description:
        skin_tone = "tan skin, olive skin"
    elif "black" in description:
        skin_tone = "dark skin, brown skin"
    else:
        skin_tone = "fair skin"
    
    # Outfit based on occupation
    outfit = "nude"
    background = "bedroom, bed, soft lighting"
    
    if data.personalityId and data.personalityId.occupationId:
        occupation = data.personalityId.occupationId.name.lower()
        
        if "artist" in occupation:
            outfit = "artist outfit, paint-stained clothes, casual clothes"
            background = "art studio, canvas, paintings, easel, artistic background"
        elif "nurse" in occupation or "doctor" in occupation:
            outfit = "nurse uniform, medical outfit, white uniform"
            background = "hospital, medical room, clinic"
        elif "teacher" in occupation:
            outfit = "teacher outfit, professional clothes, glasses"
            background = "classroom, desk, blackboard, school"
        elif "dating coach" in occupation:
            outfit = "elegant dress, professional outfit, stylish clothes"
            background = "office, cozy room, modern interior, elegant setting"
        elif "secretary" in occupation or "office" in occupation:
            outfit = "office outfit, business suit, professional clothes"
            background = "office, desk, corporate setting"
    
    return {
        "name": name,
        "age": age,
        "hair_color": hair_color,
        "hair_style": hair_style,
        "eyes": eye_color,
        "skin": skin_tone,
        "outfit": outfit,
        "background": background,
    }

# ============================================
# BUILD LUSTIFY PROMPT (USES FULL POSE PROMPT)
# ============================================
def build_lustify_prompt(character: Dict[str, str], pose_data: Optional[PoseData] = None) -> str:
    """Build LUSTIFY prompt using FULL pose prompt from API"""
    
    name = character["name"]
    age = character["age"]
    hair_color = character["hair_color"]
    hair_style = character["hair_style"]
    eyes = character["eyes"]
    skin = character["skin"]
    bg = character["background"]
    
    # Get FULL pose prompt from API
    if pose_data and pose_data.prompt:
        # Use API pose prompt directly
        api_pose_prompt = pose_data.prompt.strip()
        
        # Remove duplicate quality tags if they exist
        api_pose_prompt = api_pose_prompt.replace("masterpiece, best quality, photorealistic:1.4,", "")
        api_pose_prompt = api_pose_prompt.replace("8k uhd.", "")
        api_pose_prompt = api_pose_prompt.strip()
        
        # Build complete LUSTIFY prompt
        prompt = f"""raw photo, realistic, photorealistic, 8k, depth of field,
shot on Canon EOS 5D, DSLR, detailed,
{api_pose_prompt},
{name}, {age}yo, {hair_color}, {hair_style}, {eyes}, {skin},
huge breasts, large breasts, D-cup breasts, firm bubble butt, wide hips, thick thighs,
{bg},
candid photo, amateur photo, natural lighting, soft shadows,
perfect anatomy, perfect skin, detailed"""
    
    else:
        # Default standing pose if no pose data
        prompt = f"""raw photo, realistic, photorealistic, 8k, depth of field,
shot on Canon EOS 5D, DSLR, detailed,
1girl, solo, standing, nude, confident pose, NSFW,
{name}, {age}yo, {hair_color}, {hair_style}, {eyes}, {skin},
huge breasts, large breasts, D-cup breasts, firm bubble butt, athletic body,
nude,
{bg},
candid photo, amateur photo, natural lighting, soft shadows,
perfect anatomy, perfect skin, detailed"""
    
    return prompt

# ============================================
# NEGATIVE PROMPT
# ============================================
NEGATIVE_PROMPT = """worst quality, low quality, normal quality,
blurry, out of focus, soft focus,
ugly, deformed, bad anatomy, bad proportions,
extra limbs, missing limbs, bad hands, bad face, mutated hands,
painting, drawing, illustration, anime, cartoon,
3d render, cgi, rendered,
watermark, text, signature,
censored, mosaic, bars,
child, minor, underage"""

# ============================================
# GENERATE IMAGE
# ============================================
def generate_image(
    character_data: CharacterData,
    quality: str = "hq",
    width: Optional[int] = None,
    height: Optional[int] = None
):
    """Generate ultra-HD realistic image"""
    
    # Load model
    model = load_model()
    
    # Parse character
    character = parse_character(character_data)
    
    # Get pose data (FULL PROMPT)
    pose_data = None
    if character_data.personalityId and character_data.personalityId.poseId:
        pose_data = character_data.personalityId.poseId
    
    # Build prompt (uses full API pose prompt)
    prompt = build_lustify_prompt(character, pose_data)
    
    print(f"🎨 Generating {character['name']}...")
    print(f"Quality: {quality}")
    if pose_data:
        print(f"Pose: {pose_data.name} ({pose_data.category})")
    
    # Settings based on quality
    if quality == "ultra":
        steps = 50
        cfg = 4.0
        default_width = 1024
        default_height = 1536
    elif quality == "hq":
        steps = 40
        cfg = 3.5
        default_width = 896
        default_height = 1344
    else:  # standard
        steps = 30
        cfg = 3.5
        default_width = 832
        default_height = 1216
    
    # Use provided dimensions or defaults
    final_width = width if width else default_width
    final_height = height if height else default_height
    
    # Generate
    t0 = time.time()
    
    image = model(
        prompt=prompt,
        negative_prompt=NEGATIVE_PROMPT,
        num_inference_steps=steps,
        guidance_scale=cfg,
        width=final_width,
        height=final_height,
    ).images[0]
    
    generation_time = time.time() - t0
    
    return image, generation_time, prompt

# ============================================
# API ENDPOINTS
# ============================================
@app.get("/")
async def root():
    """API health check"""
    return {
        "status": "online",
        "service": "LUSTIFY Image Generator",
        "version": "1.0.0",
        "model": "LUSTIFY v7",
        "features": [
            "Uses FULL pose prompt from API",
            "Ultra-HD realistic images",
            "Enhanced VAE quality",
            "LUSTIFY official settings"
        ],
        "endpoints": {
            "generate": "/generate",
            "health": "/health"
        }
    }

@app.get("/health")
async def health():
    """Health check"""
    model_loaded = pipe is not None
    return {
        "status": "healthy" if model_loaded else "initializing",
        "model_loaded": model_loaded,
        "gpu_available": torch.cuda.is_available(),
        "gpu_name": torch.cuda.get_device_name(0) if torch.cuda.is_available() else None
    }

@app.post("/generate")
async def generate(request: GenerateRequest):
    """
    Generate ultra-HD realistic image
    
    Uses FULL pose prompt from API poseId.prompt field
    
    Example Request:
    {
        "character_data": {
            "name": "Hello-pio",
            "age": 23,
            "gender": "Female",
            "description": "A 23 year old white Female with blonde braided hair and blue eyes.",
            "personalityId": {
                "occupationId": {
                    "name": "Dating Coach"
                },
                "poseId": {
                    "name": "Cum on Body",
                    "category": "Aftermath",
                    "prompt": "masterpiece, best quality, photorealistic:1.4, cum on body pose with semen on skin, NSFW explicit, satisfied expression, detailed semen and skin:1.3, 8k uhd."
                }
            }
        },
        "quality": "hq"
    }
    """
    
    try:
        # Generate image
        image, gen_time, prompt = generate_image(
            request.character_data,
            request.quality,
            request.width,
            request.height
        )
        
        # Convert to base64
        buffered = BytesIO()
        image.save(buffered, format="PNG", quality=95, optimize=True)
        img_base64 = base64.b64encode(buffered.getvalue()).decode()
        
        # Get pose info
        pose_name = "Standing (Default)"
        pose_category = "Community"
        pose_prompt_used = None
        
        if request.character_data.personalityId and request.character_data.personalityId.poseId:
            pose_name = request.character_data.personalityId.poseId.name
            pose_category = request.character_data.personalityId.poseId.category
            pose_prompt_used = request.character_data.personalityId.poseId.prompt
        
        return {
            "success": True,
            "data": {
                "image": img_base64,
                "character_name": request.character_data.name,
                "character_age": request.character_data.age,
                "pose": pose_name,
                "pose_category": pose_category,
                "pose_prompt_from_api": pose_prompt_used,
                "quality": request.quality,
                "width": request.width or (1024 if request.quality == "ultra" else 896),
                "height": request.height or (1536 if request.quality == "ultra" else 1344),
                "generation_time": f"{gen_time:.2f}s",
                "full_prompt_used": prompt
            }
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# STARTUP EVENT
# ============================================
@app.on_event("startup")
async def startup_event():
    """Load model on startup"""
    print("\n" + "="*60)
    print("🚀 LUSTIFY API SERVER STARTING...")
    print("="*60 + "\n")
    load_model()
    print("\n" + "="*60)
    print("✅ SERVER READY!")
    print("📍 Listening on http://0.0.0.0:8000")
    print("="*60 + "\n")

# ============================================
# RUN SERVER
# ============================================
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info"
    )









    ================ update code ================





    #!/usr/bin/env python3
"""
LUSTIFY FastAPI Server - Complete with Pose Library
Ultra-HD Realistic NSFW Image Generation
"""
import os
os.environ['HF_HUB_ENABLE_HF_TRANSFER'] = '0'

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict
import torch
import base64
from io import BytesIO
from diffusers import StableDiffusionXLPipeline, DPMSolverMultistepScheduler, AutoencoderKL
import time
import glob
import json

# ============================================
# LOAD POSE LIBRARY
# ============================================
POSE_LIBRARY = {
    "community": {
        "Standing": "1girl, solo, standing, legs slightly apart, arms at sides, NSFW nude, confident expression",
        "Spread Legs": "1girl, solo, sitting on bed, spread legs, legs apart, NSFW explicit genital view, seductive gaze",
        "Kneeling": "1girl, solo, kneeling, on knees, looking up submissively, NSFW nude",
        "Bent Over": "1girl, solo, bent over, touching toes, NSFW rear view, teasing smile over shoulder",
        "On Back": "1girl, solo, lying on back, arms above head, NSFW nude, relaxed aroused expression",
    },
    "oral": {
        "Blowjob": "1girl, 1boy, oral sex, blowjob, fellatio, penis, cock in mouth, sucking dick, NSFW explicit, eye contact",
        "Deepthroat": "1girl, 1boy, oral sex, deepthroat, deep blowjob, penis deep in throat, throat bulge, NSFW explicit, teary eyes",
        "Titfuck": "1girl, 1boy, titfuck, paizuri, penis between breasts, breast sex, NSFW explicit, seductive gaze",
    },
    "intercourse": {
        "Missionary": "1girl, 1boy, vaginal sex, missionary position, penis, penetration, spread legs, NSFW explicit, intimate eye contact",
        "Doggy Style": "1girl, 1boy, vaginal sex, doggystyle, doggy style, penis, sex from behind, bent over, arched back, ass, NSFW explicit",
        "Cowgirl": "1girl, 1boy, vaginal sex, cowgirl position, penis, girl on top, riding, straddling, NSFW explicit, dominant expression",
        "Reverse Cowgirl": "1girl, 1boy, vaginal sex, reverse cowgirl, penis, girl on top, facing away, riding, ass view, NSFW explicit",
    },
    "aftermath": {
        "Cum on Body": "1girl, 1boy, after sex, cum on body, semen on skin, covered in cum, NSFW explicit, satisfied expression",
        "Creampie": "1girl, 1boy, after sex, creampie, cum dripping from pussy, semen dripping from vagina, NSFW explicit, post-orgasm",
        "Facial": "1girl, 1boy, cumshot, cum on face, facial, semen on face, NSFW explicit, open mouth",
    }
}

# ============================================
# FASTAPI APP
# ============================================
app = FastAPI(title="LUSTIFY Image Generator", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================
# FIND MODEL
# ============================================
def find_model_file():
    search_paths = [
        "/workspace/lustify.safetensors",
        "/workspace/lustify_7.safetensors",
        "/workspace/*.safetensors",
    ]
    
    for path in search_paths:
        if "*" in path:
            files = glob.glob(path)
            if files:
                print(f"✅ Found model: {files[0]}")
                return files[0]
        else:
            if os.path.exists(path):
                print(f"✅ Found model: {path}")
                return path
    return None

# ============================================
# GLOBAL MODEL
# ============================================
pipe = None
MODEL_PATH = None

def load_model():
    global pipe, MODEL_PATH
    
    if pipe is not None:
        return pipe
    
    MODEL_PATH = find_model_file()
    
    if MODEL_PATH is None:
        raise FileNotFoundError("LUSTIFY model file not found in /workspace/")
    
    print(f"\n🔥 Loading LUSTIFY model from: {MODEL_PATH}")
    
    vae = AutoencoderKL.from_pretrained(
        "madebyollin/sdxl-vae-fp16-fix",
        torch_dtype=torch.float16
    )
    
    pipe = StableDiffusionXLPipeline.from_single_file(
        MODEL_PATH,
        torch_dtype=torch.float16,
        use_safetensors=True,
        vae=vae
    )
    
    pipe.scheduler = DPMSolverMultistepScheduler.from_config(
        pipe.scheduler.config,
        use_karras_sigmas=True,
        algorithm_type="sde-dpmsolver++",
        solver_order=2
    )
    
    pipe = pipe.to("cuda")
    pipe.enable_vae_slicing()
    pipe.enable_vae_tiling()
    
    try:
        pipe.enable_xformers_memory_efficient_attention()
    except:
        pass
    
    print("✅ LUSTIFY model loaded!")
    return pipe

# ============================================
# PYDANTIC MODELS
# ============================================
class PoseData(BaseModel):
    name: str
    category: str
    prompt: str

class PersonalityData(BaseModel):
    poseId: Optional[PoseData] = None

class CharacterData(BaseModel):
    name: str
    age: int
    gender: str
    description: str
    personalityId: Optional[PersonalityData] = None

class GenerateRequest(BaseModel):
    character_data: CharacterData
    quality: Optional[str] = "hq"

# ============================================
# PARSE CHARACTER
# ============================================
def parse_character(data: CharacterData) -> Dict[str, str]:
    name = data.name
    age = data.age
    desc = data.description.lower()
    
    # Hair
    hair_color = "blonde hair" if "blonde" in desc else "brown hair"
    if "red" in desc or "ginger" in desc:
        hair_color = "red hair, ginger hair"
    
    hair_style = "braided hair" if "braid" in desc else "long hair"
    
    # Eyes
    eyes = "blue eyes" if "blue" in desc else "brown eyes"
    if "green" in desc:
        eyes = "green eyes"
    
    # Skin
    skin = "fair skin, pale skin" if "white" in desc else "fair skin"
    
    # Background
    bg = "bedroom, bed, soft lighting"
    
    return {
        "name": name,
        "age": age,
        "hair": f"{hair_color}, {hair_style}",
        "eyes": eyes,
        "skin": skin,
        "background": bg,
    }

# ============================================
# BUILD LUSTIFY PROMPT
# ============================================
def build_lustify_prompt(character: Dict[str, str], pose_data: Optional[PoseData] = None) -> str:
    name = character["name"]
    age = character["age"]
    hair = character["hair"]
    eyes = character["eyes"]
    skin = character["skin"]
    bg = character["background"]
    
    if pose_data and pose_data.prompt:
        # Clean API pose prompt
        api_prompt = pose_data.prompt.strip()
        api_prompt = api_prompt.replace("masterpiece, best quality, photorealistic:1.4,", "")
        api_prompt = api_prompt.replace("Aria Voss 26 year old curvy athletic woman with long wavy auburn hair, large D-cup breasts, firm bubble butt,", "")
        api_prompt = api_prompt.replace(":1.3,", ",")
        api_prompt = api_prompt.replace("8k uhd.", "")
        api_prompt = api_prompt.replace("8k uhd,", "")
        api_prompt = api_prompt.strip()
        
        prompt = f"""raw photo, realistic, photorealistic, 8k, depth of field,
shot on Canon EOS 5D, DSLR, detailed,
{api_prompt},
{name}, {age}yo, {hair}, {eyes}, {skin},
huge breasts, large breasts, D-cup breasts, firm bubble butt, wide hips,
{bg},
candid photo, amateur photo, natural lighting, soft shadows,
perfect anatomy, perfect skin, detailed"""
    else:
        prompt = f"""raw photo, realistic, photorealistic, 8k, depth of field,
shot on Canon EOS 5D, DSLR, detailed,
1girl, solo, standing, nude, NSFW,
{name}, {age}yo, {hair}, {eyes}, {skin},
huge breasts, large breasts, firm bubble butt,
nude, {bg},
candid photo, natural lighting,
perfect anatomy, perfect skin, detailed"""
    
    return prompt

NEGATIVE_PROMPT = """worst quality, low quality, normal quality,
blurry, out of focus, ugly, deformed, bad anatomy,
extra limbs, bad hands, painting, cartoon, anime,
watermark, censored, child"""

# ============================================
# GENERATE
# ============================================
def generate_image(character_data: CharacterData, quality: str = "hq"):
    model = load_model()
    character = parse_character(character_data)
    
    pose_data = None
    if character_data.personalityId and character_data.personalityId.poseId:
        pose_data = character_data.personalityId.poseId
    
    prompt = build_lustify_prompt(character, pose_data)
    
    if quality == "ultra":
        steps, cfg, w, h = 50, 4.0, 1024, 1536
    elif quality == "hq":
        steps, cfg, w, h = 40, 3.5, 896, 1344
    else:
        steps, cfg, w, h = 30, 3.5, 832, 1216
    
    print(f"🎨 Generating: {character['name']} | {quality} | {w}x{h}")
    
    t0 = time.time()
    
    image = model(
        prompt=prompt,
        negative_prompt=NEGATIVE_PROMPT,
        num_inference_steps=steps,
        guidance_scale=cfg,
        width=w,
        height=h,
    ).images[0]
    
    return image, time.time() - t0, prompt

# ============================================
# ENDPOINTS
# ============================================
@app.get("/")
async def root():
    return {
        "status": "online",
        "service": "LUSTIFY Image Generator",
        "version": "2.0.0",
        "model_loaded": pipe is not None,
        "model_path": MODEL_PATH,
        "endpoints": {
            "generate": "/generate",
            "health": "/health",
            "poses": "/poses"
        }
    }

@app.get("/health")
async def health():
    return {
        "status": "healthy" if pipe is not None else "model not loaded",
        "model_loaded": pipe is not None,
        "model_path": MODEL_PATH,
        "gpu_available": torch.cuda.is_available()
    }

@app.get("/poses")
async def get_poses():
    """Get all available poses"""
    return {
        "total_categories": len(POSE_LIBRARY),
        "total_poses": sum(len(poses) for poses in POSE_LIBRARY.values()),
        "poses": POSE_LIBRARY
    }

@app.post("/generate")
async def generate(request: GenerateRequest):
    try:
        image, gen_time, prompt = generate_image(
            request.character_data,
            request.quality
        )
        
        buffered = BytesIO()
        image.save(buffered, format="PNG", quality=95)
        img_base64 = base64.b64encode(buffered.getvalue()).decode()
        
        pose_name = "Standing"
        pose_category = "Community"
        
        if request.character_data.personalityId and request.character_data.personalityId.poseId:
            pose_name = request.character_data.personalityId.poseId.name
            pose_category = request.character_data.personalityId.poseId.category
        
        return {
            "success": True,
            "data": {
                "image": img_base64,
                "character_name": request.character_data.name,
                "pose": pose_name,
                "pose_category": pose_category,
                "quality": request.quality,
                "generation_time": f"{gen_time:.2f}s",
                "prompt_used": prompt
            }
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# STARTUP
# ============================================
@app.on_event("startup")
async def startup_event():
    print("\n" + "="*60)
    print("🚀 LUSTIFY API SERVER STARTING...")
    print("="*60 + "\n")
    
    try:
        load_model()
        print(f"\n✅ Pose library loaded: {sum(len(poses) for poses in POSE_LIBRARY.values())} poses")
        print("\n" + "="*60)
        print("✅ SERVER READY!")
        print("="*60 + "\n")
    except Exception as e:
        print(f"\n❌ Startup failed: {e}\n")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
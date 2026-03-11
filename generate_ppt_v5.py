import os
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN

prs = Presentation()
# Set slide dimensions to 16:9 widescreen for perfect modern fit
prs.slide_width = Inches(13.333)
prs.slide_height = Inches(7.5)

# --- Aesthetic Theme Colors ---
BG_COLOR = RGBColor(250, 250, 250) # Very light gray/white
TEXT_COLOR = RGBColor(33, 37, 41)  # Dark charcoal for easy reading
TITLE_COLOR = RGBColor(0, 51, 102) # Deep navy blue for important titles
SUBTEXT_COLOR = RGBColor(100, 100, 100) # Medium gray

def apply_light_theme(slide):
    background = slide.background
    fill = background.fill
    fill.solid()
    fill.fore_color.rgb = BG_COLOR

def style_run(run, size_pt, bold=False, color=TEXT_COLOR, is_title=False):
    run.font.name = "Segoe UI"
    run.font.size = Pt(size_pt)
    run.font.bold = bold
    if is_title:
        run.font.color.rgb = TITLE_COLOR
    else:
        run.font.color.rgb = color

def add_title(slide, text):
    txBox = slide.shapes.add_textbox(Inches(0.5), Inches(0.5), Inches(12.333), Inches(1.2))
    p = txBox.text_frame.add_paragraph()
    p.text = text
    style_run(p.runs[0], size_pt=48, bold=True, is_title=True)
    return txBox

def add_body(slide, text, left, top, width, height, font_size=32):
    txBox = slide.shapes.add_textbox(Inches(left), Inches(top), Inches(width), Inches(height))
    tf = txBox.text_frame
    tf.word_wrap = True
    paragraphs = text.split('\n')
    for i, line in enumerate(paragraphs):
        p = tf.add_paragraph() if i > 0 else tf.paragraphs[0]
        p.text = line
        if line.strip():
            # Add some spacing before paragraphs
            if i > 0 and line.startswith("•"):
                p.space_before = Pt(14)
            style_run(p.runs[0], size_pt=font_size)
    return txBox

# --- Slide 1: Title ---
slide = prs.slides.add_slide(prs.slide_layouts[6]) # Blank layout
apply_light_theme(slide)

txBox = slide.shapes.add_textbox(Inches(1), Inches(2.2), Inches(11.333), Inches(2))
tf = txBox.text_frame
p = tf.add_paragraph()
p.text = "Nexoraa"
p.alignment = PP_ALIGN.CENTER
style_run(p.runs[0], size_pt=95, bold=True, is_title=True)

p2 = tf.add_paragraph()
p2.text = "Turning Crisis into Action"
p2.alignment = PP_ALIGN.CENTER
style_run(p2.runs[0], size_pt=36, color=TEXT_COLOR)

p3 = tf.add_paragraph()
p3.text = "\nBy: Gopal Maurya"
p3.alignment = PP_ALIGN.CENTER
style_run(p3.runs[0], size_pt=24, color=SUBTEXT_COLOR)


# --- Slide 2: The Problem ---
slide = prs.slides.add_slide(prs.slide_layouts[6])
apply_light_theme(slide)
add_title(slide, "1. The Big Problem")

body_text = (
    "• In a disaster, everyone posts on social media for help.\n"
    "• Example: During the 2015 Chennai Floods, 100 crashed and Twitter was flooded with #ChennaiRainsHelp.\n"
    "• Human rescue teams cannot read thousands of tweets fast enough.\n"
    "• The result? People wait hours for help because their plea gets lost in the noise."
)
add_body(slide, body_text, 0.5, 2.0, 7.0, 4.5, font_size=28)

img_path_1 = r"C:\Users\gopal\.antigravity\anti\nexoraa\disaster_real.jpg"
if os.path.exists(img_path_1):
    # Add a border to make it pop on white
    pic = slide.shapes.add_picture(img_path_1, Inches(7.8), Inches(2.0), width=Inches(5.0))
    pic.line.color.rgb = RGBColor(200, 200, 200)


# --- Slide 3: The AI Solution ---
slide = prs.slides.add_slide(prs.slide_layouts[6])
apply_light_theme(slide)
add_title(slide, "2. Our Simple AI Solution")

intro = "What if a computer could read every message instantly?"
txIntro = add_body(slide, intro, 0.5, 1.8, 12.333, 1, font_size=36)
txIntro.text_frame.paragraphs[0].runs[0].font.bold = True
txIntro.text_frame.paragraphs[0].runs[0].font.color.rgb = TITLE_COLOR

steps_text = (
    "How Nexoraa works in milliseconds:\n\n"
    "1. Reads: Looks at the text (e.g., 'Need water in Surat!').\n"
    "2. Understands: Knows that this is an urgent Food/Water need.\n"
    "3. Maps: Instantly puts a red pin on a map right over Surat."
)
add_body(slide, steps_text, 0.5, 3.2, 11.0, 3.5, font_size=32)


# --- Slide 4: The Tool ---
slide = prs.slides.add_slide(prs.slide_layouts[6])
apply_light_theme(slide)
add_title(slide, "3. The Command Center")

dash_text = (
    "• Easy to use live dashboard.\n"
    "• Automatically maps new pleas for help.\n"
    "• Shows the exact place and type of emergency so teams just know where to drive."
)
add_body(slide, dash_text, 0.5, 2.0, 5.5, 4.5, font_size=28)

# App image 1
img_path_dash1 = r"C:\Users\gopal\.gemini\antigravity\brain\6a9f0743-1c3c-455a-b4ff-67f3fe73657e\.system_generated\click_feedback\click_feedback_1772879799918.png"
if os.path.exists(img_path_dash1):
    pic1 = slide.shapes.add_picture(img_path_dash1, Inches(6.5), Inches(1.5), width=Inches(6.3))
    pic1.line.color.rgb = RGBColor(200, 200, 200)

# App image 2
img_path_dash2 = r"C:\Users\gopal\.gemini\antigravity\brain\6a9f0743-1c3c-455a-b4ff-67f3fe73657e\.system_generated\click_feedback\click_feedback_1772879717284.png"
if os.path.exists(img_path_dash2):
    pic2 = slide.shapes.add_picture(img_path_dash2, Inches(6.5), Inches(4.5), width=Inches(6.3))
    pic2.line.color.rgb = RGBColor(200, 200, 200)


# --- Slide 4: Rescuer Dashboard ---
slide = prs.slides.add_slide(prs.slide_layouts[6])
apply_light_theme(slide)
add_title(slide, "4. Rescuer Dashboard & Collaboration")

dash_features = (
    "• Dedicated Volunteer View: Rescuers get a clean dashboard of active cries for help.\n"
    "• Status Tracking: One-click actions to mark a signal as 'En Route' or 'Resolved'.\n"
    "• Global Synchronization: Once a rescuer targets a mission, all other teams see it live, preventing duplicate efforts."
)
add_body(slide, dash_features, 0.5, 2.0, 11.0, 4.5, font_size=28)


# --- Slide 5: The Impact ---
slide = prs.slides.add_slide(prs.slide_layouts[6])
apply_light_theme(slide)
add_title(slide, "5. Why It Matters")

impact_text = (
    "• Saves Time: We cut down sorting time from hours to zero.\n"
    "• Smart Dispatch: Rescue teams, boats, and ambulances are sent exactly where they are needed most.\n"
    "• True Automation: The ultimate tool to guarantee no cry for help is ever ignored."
)
add_body(slide, impact_text, 0.5, 2.0, 7.0, 4.5, font_size=28)

img_path_3 = r"C:\Users\gopal\.antigravity\anti\nexoraa\rescue_real.jpg"
if os.path.exists(img_path_3):
    pic3 = slide.shapes.add_picture(img_path_3, Inches(7.8), Inches(2.0), width=Inches(5.0))
    pic3.line.color.rgb = RGBColor(200, 200, 200)

# Save the presentation
output_name = "Nexoraa_Hackathon_Pitch_V7.pptx"
prs.save(output_name)
print(f"Masterpiece 6-Slide Clean Light Theme created: {output_name}!")

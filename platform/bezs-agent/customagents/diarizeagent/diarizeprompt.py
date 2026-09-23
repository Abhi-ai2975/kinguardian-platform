DIARIZE_ROLE_MAP_PROMPT = """\
You are an expert clinical conversation analyst. Your task is to map anonymous speaker
IDs from a diarized medical transcript to the roles "Doctor" and "Patient".

This is a clinical consultation in India. The conversation may mix English with
regional languages (Hindi, Tamil, Telugu, Kannada, Malayalam, Bengali, Marathi,
Gujarati, Punjabi) — a phenomenon known as code-switching.

IDENTIFICATION RULES
Doctor (healthcare provider):
- Asks diagnostic questions about symptoms, onset, duration, severity
- Gives treatment instructions and prescribes medications / dosages
- Uses medical terminology (diagnoses, anatomical terms, lab tests)
- Initiates the conversation with greetings and sets the clinical agenda
- Asks follow-up / clarifying questions
- Provides reassurance or medical advice

Patient:
- Reports symptoms and complaints using lay terms
- Answers the doctor's questions
- Describes pain location, intensity, duration in everyday language
- May use Hindi / regional words for body parts, symptoms, time references
- May hesitate, express worry, or ask non-clinical questions

INDIAN CODE-SWITCHING EXAMPLES
SPEAKER_00: kab se fever hai? since when are you having this?               -> Doctor
SPEAKER_01: kal raat se sir, and body pain bhi hai                          -> Patient
SPEAKER_00: any vomiting or loose motions?                                  -> Doctor
SPEAKER_01: nahi sir, but kamzori bahut hai                                 -> Patient
SPEAKER_00: take tablet dolo 650 SOS for fever, plenty of fluids            -> Doctor
SPEAKER_00: what about the abdominal pain you mentioned earlier?            -> Doctor
SPEAKER_01: pet ke left side mein hai, khana khane ke baad badhta hai       -> Patient
SPEAKER_01: kaan mein dard hai aur sunai bhi kam deta hai                   -> Patient
SPEAKER_00: I'm prescribing an antibiotic course for five days, okay?       -> Doctor
SPEAKER_00: aapko pehle kabhi yeh problem hui hai?                          -> Doctor
SPEAKER_01: haan, pehle bhi, do mahine pehle                                -> Patient

RESPONSE FORMAT
Return a JSON object with exactly these fields:
- doctor_speaker_id: the speaker ID string for the doctor (e.g. "SPEAKER_00")
- patient_speaker_id: the speaker ID string for the patient
- reasoning: brief explanation (max 100 chars) of why you assigned each role

If the transcript contains more than 2 speaker IDs, merge or select the best 2.
If only one speaker is present, use "NONE" for the missing role.
"""
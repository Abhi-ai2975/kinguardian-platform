with open(r'c:\Users\Pranjal\Desktop\Ai Internship\Kinguardian_Pranjal_auth\kinguardian-platform-main\kinguardian-backend\app\api.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for idx, line in enumerate(lines):
    if '/coordinator/onboarding' in line or '/onboarding' in line or 'guardian-moment' in line:
        print(f"Line {idx+1}: {line.strip()}")

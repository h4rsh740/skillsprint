import json
import sys

transcript_path = "/Users/harshsingh/.gemini/antigravity-ide/brain/10453761-80f5-484d-9e9f-0a6da0a5e8c6/.system_generated/logs/transcript.jsonl"

def extract_file(filename):
    print(f"Searching for {filename}...")
    with open(transcript_path, 'r') as f:
        for line in f:
            try:
                data = json.loads(line)
                # Check tool calls
                if 'tool_calls' in data:
                    for tc in data['tool_calls']:
                        if tc.get('name') in ['default_api:write_to_file', 'default_api:replace_file_content', 'default_api:multi_replace_file_content']:
                            args = tc.get('arguments', {})
                            if filename in args.get('TargetFile', ''):
                                print(f"Found edit for {filename}!")
                                print(json.dumps(args, indent=2))
                                return
                # Check tool responses
                if 'tool_responses' in data:
                    for tr in data['tool_responses']:
                        out = tr.get('output', '')
                        if filename in out and 'Total Lines:' in out:
                            print(f"Found view_file for {filename}!")
                            print(out[:1000] + "...\n[TRUNCATED]")
                            return
            except Exception as e:
                pass

extract_file("SidebarNav.tsx")
extract_file("career-twin/page.tsx")
extract_file("dashboard/layout.tsx")

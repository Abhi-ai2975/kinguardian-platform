
import asyncio
import httpx
from fhir.resources.patient import Patient

async def test_patient_flow():
    base_url = "http://localhost:8000"
    
    # Wait for server to be ready
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(f"{base_url}/health")
            if resp.status_code != 200:
                print("Server not ready")
                return
        except Exception:
            print("Server not reachable. Please run: fastapi dev app/main.py")
            return

        # Create Patient
        patient_data = {
            "resourceType": "Patient",
            "active": True,
            "gender": "male",
            "birthDate": "1980-01-01",
            "name": [{"family": "Doe", "given": ["John"], "use": "official"}],
            "identifier": [{"system": "http://hospital.org", "value": "12345", "use": "official"}],
            "telecom": [{"system": "phone", "value": "555-1234", "use": "home"}],
            "address": [{"line": ["123 Main St"], "city": "Metropolis", "state": "NY", "postalCode": "10001", "country": "USA"}]
        }
        
        print(f"Creating Patient...")
        try:
            resp = await client.post(f"{base_url}/Patient/", json=patient_data)
            print(f"Create Response: {resp.status_code}")
            if resp.status_code == 201:
                created_patient = Patient.parse_obj(resp.json())
                print(f"Created Patient ID: {created_patient.id}")
                
                # Get Patient
                print(f"Fetching Patient {created_patient.id}...")
                resp = await client.get(f"{base_url}/Patient/{created_patient.id}")
                print(f"Get Response: {resp.status_code}")
                if resp.status_code == 200:
                    fetched_patient = Patient.parse_obj(resp.json())
                    print(f"Fetched Patient:")
                    print(f" - Name: {fetched_patient.name[0].given[0]} {fetched_patient.name[0].family}")
                    print(f" - ID: {fetched_patient.identifier[0].value}")
                    print(f" - Telecom: {fetched_patient.telecom[0].value}")
                    print(f" - Address: {fetched_patient.address[0].city}, {fetched_patient.address[0].state}")
                    
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_patient_flow())

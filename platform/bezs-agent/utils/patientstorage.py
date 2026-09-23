from pathlib import Path


def get_patient_folder(base_dir: Path, patient_id: str) -> Path:

    patients_dir = base_dir / "patients"

    patients_dir.mkdir(exist_ok=True)

    patient_dir = patients_dir / patient_id

    patient_dir.mkdir(exist_ok=True)

    return patient_dir
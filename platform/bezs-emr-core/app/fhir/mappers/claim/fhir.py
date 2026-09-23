from __future__ import annotations

from app.fhir.datatypes import fhir_enum, fhir_identifier, fhir_split


def _fhir_cc(system, code, display, text) -> dict:
    coding = {k: v for k, v in {"system": system, "code": code, "display": display}.items() if v}
    entry: dict = {}
    if coding:
        entry["coding"] = [coding]
    if text:
        entry["text"] = text
    return entry


def _fhir_ref(ref_type, ref_id, display=None) -> dict:
    entry: dict = {}
    t = fhir_enum(ref_type) if ref_type else None
    if t and ref_id is not None:
        entry["reference"] = f"{t}/{ref_id}"
    if display:
        entry["display"] = display
    return entry


def _fhir_money(value, currency):
    if value is None and not currency:
        return None
    m: dict = {}
    if value is not None:
        m["value"] = float(value)
    if currency:
        m["currency"] = currency
    return m or None


def _fhir_quantity(value, unit, system, code):
    if value is None:
        return None
    q: dict = {"value": float(value)}
    if unit:
        q["unit"] = unit
    if system:
        q["system"] = system
    if code:
        q["code"] = code
    return q


def _fhir_cc_list(items) -> list:
    result = []
    for i in items:
        coding = {k: v for k, v in {"system": i.coding_system, "code": i.coding_code, "display": i.coding_display}.items() if v}
        cc: dict = {}
        if coding:
            cc["coding"] = [coding]
        if i.text:
            cc["text"] = i.text
        if cc:
            result.append(cc)
    return result


def _fhir_ref_list(items) -> list:
    return [_fhir_ref(u.reference_type, u.reference_id, u.reference_display) for u in items if u.reference_id is not None]


def fhir_claim_identifier(i) -> dict:
    return fhir_identifier(i)


def fhir_claim_related(r) -> dict:
    entry: dict = {}
    claim_ref = _fhir_ref(r.related_claim_type, r.related_claim_id, r.related_claim_display)
    if claim_ref:
        entry["claim"] = claim_ref
    rel_cc = _fhir_cc(r.relationship_system, r.relationship_code, r.relationship_display, r.relationship_text)
    if rel_cc:
        entry["relationship"] = rel_cc
    ref_id: dict = {}
    if r.reference_use:
        ref_id["use"] = r.reference_use
    if r.reference_type_system or r.reference_type_code or r.reference_type_text:
        type_cc: dict = {}
        coding = {k: v for k, v in {"system": r.reference_type_system, "code": r.reference_type_code, "display": r.reference_type_display}.items() if v}
        if coding:
            type_cc["coding"] = [coding]
        if r.reference_type_text:
            type_cc["text"] = r.reference_type_text
        ref_id["type"] = type_cc
    if r.reference_system:
        ref_id["system"] = r.reference_system
    if r.reference_value:
        ref_id["value"] = r.reference_value
    if r.reference_period_start or r.reference_period_end:
        ref_id["period"] = {k: v for k, v in {
            "start": r.reference_period_start.isoformat() if r.reference_period_start else None,
            "end": r.reference_period_end.isoformat() if r.reference_period_end else None,
        }.items() if v}
    if r.reference_assigner:
        ref_id["assigner"] = {"display": r.reference_assigner}
    if ref_id:
        entry["reference"] = ref_id
    return entry


def fhir_claim_care_team(ct) -> dict:
    entry: dict = {}
    if ct.sequence:
        entry["sequence"] = ct.sequence
    prov_ref = _fhir_ref(ct.provider_type, ct.provider_id, ct.provider_display)
    if prov_ref:
        entry["provider"] = prov_ref
    if ct.responsible is not None:
        entry["responsible"] = ct.responsible
    role_cc = _fhir_cc(ct.role_system, ct.role_code, ct.role_display, ct.role_text)
    if role_cc:
        entry["role"] = role_cc
    qual_cc = _fhir_cc(ct.qualification_system, ct.qualification_code, ct.qualification_display, ct.qualification_text)
    if qual_cc:
        entry["qualification"] = qual_cc
    return entry


def fhir_claim_supporting_info(si) -> dict:
    entry: dict = {}
    if si.sequence:
        entry["sequence"] = si.sequence
    cat_cc = _fhir_cc(si.category_system, si.category_code, si.category_display, si.category_text)
    if cat_cc:
        entry["category"] = cat_cc
    code_cc = _fhir_cc(si.code_system, si.code_code, si.code_display, si.code_text)
    if code_cc:
        entry["code"] = code_cc
    if si.timing_date:
        entry["timingDate"] = si.timing_date.isoformat()
    if si.timing_period_start or si.timing_period_end:
        entry["timingPeriod"] = {k: v for k, v in {
            "start": si.timing_period_start.isoformat() if si.timing_period_start else None,
            "end": si.timing_period_end.isoformat() if si.timing_period_end else None,
        }.items() if v}
    if si.value_boolean is not None:
        entry["valueBoolean"] = si.value_boolean
    if si.value_string:
        entry["valueString"] = si.value_string
    qty = _fhir_quantity(si.value_quantity_value, si.value_quantity_unit, si.value_quantity_system, si.value_quantity_code)
    if qty:
        if si.value_quantity_comparator:
            qty["comparator"] = si.value_quantity_comparator
        entry["valueQuantity"] = qty
    if si.value_attachment_content_type or si.value_attachment_url or si.value_attachment_data:
        att: dict = {}
        if si.value_attachment_content_type:
            att["contentType"] = si.value_attachment_content_type
        if si.value_attachment_language:
            att["language"] = si.value_attachment_language
        if si.value_attachment_data:
            att["data"] = si.value_attachment_data
        if si.value_attachment_url:
            att["url"] = si.value_attachment_url
        if si.value_attachment_size:
            att["size"] = si.value_attachment_size
        if si.value_attachment_hash:
            att["hash"] = si.value_attachment_hash
        if si.value_attachment_title:
            att["title"] = si.value_attachment_title
        if si.value_attachment_creation:
            att["creation"] = si.value_attachment_creation.isoformat()
        entry["valueAttachment"] = att
    if si.value_reference_type or si.value_reference_id is not None:
        vref: dict = {}
        if si.value_reference_type and si.value_reference_id is not None:
            vref["reference"] = f"{si.value_reference_type}/{si.value_reference_id}"
        if si.value_reference_display:
            vref["display"] = si.value_reference_display
        entry["valueReference"] = vref
    reason_cc = _fhir_cc(si.reason_system, si.reason_code, si.reason_display, si.reason_text)
    if reason_cc:
        entry["reason"] = reason_cc
    return entry


def fhir_claim_diagnosis_type(dt) -> dict:
    coding = {k: v for k, v in {"system": dt.coding_system, "code": dt.coding_code, "display": dt.coding_display}.items() if v}
    entry: dict = {}
    if coding:
        entry["coding"] = [coding]
    if dt.text:
        entry["text"] = dt.text
    return entry


def fhir_claim_diagnosis(d) -> dict:
    entry: dict = {}
    if d.sequence:
        entry["sequence"] = d.sequence
    dx_cc = _fhir_cc(d.diagnosis_codeable_concept_system, d.diagnosis_codeable_concept_code, d.diagnosis_codeable_concept_display, d.diagnosis_codeable_concept_text)
    if dx_cc:
        entry["diagnosisCodeableConcept"] = dx_cc
    dx_ref = _fhir_ref(d.diagnosis_reference_type, d.diagnosis_reference_id, d.diagnosis_reference_display)
    if dx_ref:
        entry["diagnosisReference"] = dx_ref
    if d.types:
        types_list = [fhir_claim_diagnosis_type(t) for t in d.types]
        if types_list:
            entry["type"] = types_list
    oa_cc = _fhir_cc(d.on_admission_system, d.on_admission_code, d.on_admission_display, d.on_admission_text)
    if oa_cc:
        entry["onAdmission"] = oa_cc
    pkg_cc = _fhir_cc(d.package_code_system, d.package_code_code, d.package_code_display, d.package_code_text)
    if pkg_cc:
        entry["packageCode"] = pkg_cc
    return entry


def fhir_claim_procedure_type(pt) -> dict:
    coding = {k: v for k, v in {"system": pt.coding_system, "code": pt.coding_code, "display": pt.coding_display}.items() if v}
    entry: dict = {}
    if coding:
        entry["coding"] = [coding]
    if pt.text:
        entry["text"] = pt.text
    return entry


def fhir_claim_procedure_udi(u) -> dict:
    return _fhir_ref(u.reference_type, u.reference_id, u.reference_display)


def fhir_claim_procedure(p) -> dict:
    entry: dict = {}
    if p.sequence:
        entry["sequence"] = p.sequence
    if p.date:
        entry["date"] = p.date.isoformat()
    proc_cc = _fhir_cc(p.procedure_codeable_concept_system, p.procedure_codeable_concept_code, p.procedure_codeable_concept_display, p.procedure_codeable_concept_text)
    if proc_cc:
        entry["procedureCodeableConcept"] = proc_cc
    proc_ref = _fhir_ref(p.procedure_reference_type, p.procedure_reference_id, p.procedure_reference_display)
    if proc_ref:
        entry["procedureReference"] = proc_ref
    if p.types:
        types_list = [fhir_claim_procedure_type(t) for t in p.types]
        if types_list:
            entry["type"] = types_list
    if p.udi:
        udi_list = [fhir_claim_procedure_udi(u) for u in p.udi if u.reference_id is not None]
        if udi_list:
            entry["udi"] = udi_list
    return entry


def fhir_claim_insurance(ins) -> dict:
    entry: dict = {}
    if ins.sequence:
        entry["sequence"] = ins.sequence
    if ins.focal is not None:
        entry["focal"] = ins.focal
    id_entry: dict = {}
    if ins.identifier_use:
        id_entry["use"] = ins.identifier_use
    if ins.identifier_type_system or ins.identifier_type_code or ins.identifier_type_text:
        type_cc: dict = {}
        coding = {k: v for k, v in {"system": ins.identifier_type_system, "code": ins.identifier_type_code, "display": ins.identifier_type_display}.items() if v}
        if coding:
            type_cc["coding"] = [coding]
        if ins.identifier_type_text:
            type_cc["text"] = ins.identifier_type_text
        id_entry["type"] = type_cc
    if ins.identifier_system:
        id_entry["system"] = ins.identifier_system
    if ins.identifier_value:
        id_entry["value"] = ins.identifier_value
    if ins.identifier_period_start or ins.identifier_period_end:
        id_entry["period"] = {k: v for k, v in {
            "start": ins.identifier_period_start.isoformat() if ins.identifier_period_start else None,
            "end": ins.identifier_period_end.isoformat() if ins.identifier_period_end else None,
        }.items() if v}
    if ins.identifier_assigner:
        id_entry["assigner"] = {"display": ins.identifier_assigner}
    if id_entry:
        entry["identifier"] = id_entry
    cov_ref = _fhir_ref(ins.coverage_type, ins.coverage_id, ins.coverage_display)
    if cov_ref:
        entry["coverage"] = cov_ref
    if ins.business_arrangement:
        entry["businessArrangement"] = ins.business_arrangement
    if ins.pre_auth_refs:
        entry["preAuthRef"] = [r.value for r in ins.pre_auth_refs]
    cr_ref = _fhir_ref(ins.claim_response_type, ins.claim_response_id, ins.claim_response_display)
    if cr_ref:
        entry["claimResponse"] = cr_ref
    return entry


def fhir_claim_item_detail_sub_detail(sd) -> dict:
    entry: dict = {"sequence": sd.sequence}
    rev_cc = _fhir_cc(sd.revenue_system, sd.revenue_code, sd.revenue_display, sd.revenue_text)
    if rev_cc:
        entry["revenue"] = rev_cc
    cat_cc = _fhir_cc(sd.category_system, sd.category_code, sd.category_display, sd.category_text)
    if cat_cc:
        entry["category"] = cat_cc
    pos_cc = _fhir_cc(sd.product_or_service_system, sd.product_or_service_code, sd.product_or_service_display, sd.product_or_service_text)
    if pos_cc:
        entry["productOrService"] = pos_cc
    if sd.modifiers:
        mods = _fhir_cc_list(sd.modifiers)
        if mods:
            entry["modifier"] = mods
    if sd.program_codes:
        pcs = _fhir_cc_list(sd.program_codes)
        if pcs:
            entry["programCode"] = pcs
    qty = _fhir_quantity(sd.quantity_value, sd.quantity_unit, sd.quantity_system, sd.quantity_code)
    if qty:
        entry["quantity"] = qty
    money = _fhir_money(sd.unit_price_value, sd.unit_price_currency)
    if money:
        entry["unitPrice"] = money
    if sd.factor is not None:
        entry["factor"] = float(sd.factor)
    net = _fhir_money(sd.net_value, sd.net_currency)
    if net:
        entry["net"] = net
    if sd.udi:
        udis = _fhir_ref_list(sd.udi)
        if udis:
            entry["udi"] = udis
    return entry


def fhir_claim_item_detail(d) -> dict:
    entry: dict = {"sequence": d.sequence}
    rev_cc = _fhir_cc(d.revenue_system, d.revenue_code, d.revenue_display, d.revenue_text)
    if rev_cc:
        entry["revenue"] = rev_cc
    cat_cc = _fhir_cc(d.category_system, d.category_code, d.category_display, d.category_text)
    if cat_cc:
        entry["category"] = cat_cc
    pos_cc = _fhir_cc(d.product_or_service_system, d.product_or_service_code, d.product_or_service_display, d.product_or_service_text)
    if pos_cc:
        entry["productOrService"] = pos_cc
    if d.modifiers:
        mods = _fhir_cc_list(d.modifiers)
        if mods:
            entry["modifier"] = mods
    if d.program_codes:
        pcs = _fhir_cc_list(d.program_codes)
        if pcs:
            entry["programCode"] = pcs
    qty = _fhir_quantity(d.quantity_value, d.quantity_unit, d.quantity_system, d.quantity_code)
    if qty:
        entry["quantity"] = qty
    money = _fhir_money(d.unit_price_value, d.unit_price_currency)
    if money:
        entry["unitPrice"] = money
    if d.factor is not None:
        entry["factor"] = float(d.factor)
    net = _fhir_money(d.net_value, d.net_currency)
    if net:
        entry["net"] = net
    if d.udi:
        udis = _fhir_ref_list(d.udi)
        if udis:
            entry["udi"] = udis
    if d.sub_details:
        sds = [fhir_claim_item_detail_sub_detail(sd) for sd in d.sub_details]
        if sds:
            entry["subDetail"] = sds
    return entry


def fhir_claim_item_encounter(enc) -> dict:
    entry: dict = {}
    ref_type = fhir_enum(enc.reference_type)
    if enc.encounter and enc.encounter.encounter_id:
        entry["reference"] = f"{ref_type}/{enc.encounter.encounter_id}"
    if enc.reference_display:
        entry["display"] = enc.reference_display
    return entry


def fhir_claim_item(item) -> dict:
    entry: dict = {"sequence": item.sequence}
    cts = fhir_split(item.care_team_sequence)
    if cts:
        entry["careTeamSequence"] = [int(x) for x in cts]
    dxs = fhir_split(item.diagnosis_sequence)
    if dxs:
        entry["diagnosisSequence"] = [int(x) for x in dxs]
    prs = fhir_split(item.procedure_sequence)
    if prs:
        entry["procedureSequence"] = [int(x) for x in prs]
    iss = fhir_split(item.information_sequence)
    if iss:
        entry["informationSequence"] = [int(x) for x in iss]
    rev_cc = _fhir_cc(item.revenue_system, item.revenue_code, item.revenue_display, item.revenue_text)
    if rev_cc:
        entry["revenue"] = rev_cc
    cat_cc = _fhir_cc(item.category_system, item.category_code, item.category_display, item.category_text)
    if cat_cc:
        entry["category"] = cat_cc
    pos_cc = _fhir_cc(item.product_or_service_system, item.product_or_service_code, item.product_or_service_display, item.product_or_service_text)
    if pos_cc:
        entry["productOrService"] = pos_cc
    if item.modifiers:
        mods = _fhir_cc_list(item.modifiers)
        if mods:
            entry["modifier"] = mods
    if item.program_codes:
        pcs = _fhir_cc_list(item.program_codes)
        if pcs:
            entry["programCode"] = pcs
    if item.serviced_date:
        entry["servicedDate"] = item.serviced_date.isoformat()
    if item.serviced_period_start or item.serviced_period_end:
        entry["servicedPeriod"] = {k: v for k, v in {
            "start": item.serviced_period_start.isoformat() if item.serviced_period_start else None,
            "end": item.serviced_period_end.isoformat() if item.serviced_period_end else None,
        }.items() if v}
    loc_cc = _fhir_cc(item.location_codeable_concept_system, item.location_codeable_concept_code, item.location_codeable_concept_display, item.location_codeable_concept_text)
    if loc_cc:
        entry["locationCodeableConcept"] = loc_cc
    if item.location_address_use or item.location_address_city or item.location_address_line:
        addr: dict = {}
        if item.location_address_use:
            addr["use"] = item.location_address_use
        if item.location_address_type:
            addr["type"] = item.location_address_type
        if item.location_address_text:
            addr["text"] = item.location_address_text
        lines = fhir_split(item.location_address_line)
        if lines:
            addr["line"] = lines
        if item.location_address_city:
            addr["city"] = item.location_address_city
        if item.location_address_district:
            addr["district"] = item.location_address_district
        if item.location_address_state:
            addr["state"] = item.location_address_state
        if item.location_address_postal_code:
            addr["postalCode"] = item.location_address_postal_code
        if item.location_address_country:
            addr["country"] = item.location_address_country
        if item.location_address_period_start or item.location_address_period_end:
            addr["period"] = {k: v for k, v in {
                "start": item.location_address_period_start.isoformat() if item.location_address_period_start else None,
                "end": item.location_address_period_end.isoformat() if item.location_address_period_end else None,
            }.items() if v}
        if addr:
            entry["locationAddress"] = addr
    loc_ref = _fhir_ref(item.location_reference_type, item.location_reference_id, item.location_reference_display)
    if loc_ref:
        entry["locationReference"] = loc_ref
    qty = _fhir_quantity(item.quantity_value, item.quantity_unit, item.quantity_system, item.quantity_code)
    if qty:
        entry["quantity"] = qty
    up = _fhir_money(item.unit_price_value, item.unit_price_currency)
    if up:
        entry["unitPrice"] = up
    if item.factor is not None:
        entry["factor"] = float(item.factor)
    net = _fhir_money(item.net_value, item.net_currency)
    if net:
        entry["net"] = net
    if item.udi:
        udis = _fhir_ref_list(item.udi)
        if udis:
            entry["udi"] = udis
    bs_cc = _fhir_cc(item.body_site_system, item.body_site_code, item.body_site_display, item.body_site_text)
    if bs_cc:
        entry["bodySite"] = bs_cc
    if item.sub_sites:
        ss = _fhir_cc_list(item.sub_sites)
        if ss:
            entry["subSite"] = ss
    if item.encounters:
        encs = [fhir_claim_item_encounter(e) for e in item.encounters if e.encounter]
        if encs:
            entry["encounter"] = encs
    if item.details:
        dets = [fhir_claim_item_detail(d) for d in item.details]
        if dets:
            entry["detail"] = dets
    return entry


def to_fhir_claim(model) -> dict:
    result: dict = {
        "resourceType": "Claim",
        "id": str(model.claim_id),
    }
    if model.identifiers:
        result["identifier"] = [fhir_identifier(i) for i in model.identifiers]
    result["status"] = fhir_enum(model.status)
    type_cc = _fhir_cc(model.type_system, model.type_code, model.type_display, model.type_text)
    if type_cc:
        result["type"] = type_cc
    sub_type_cc = _fhir_cc(model.sub_type_system, model.sub_type_code, model.sub_type_display, model.sub_type_text)
    if sub_type_cc:
        result["subType"] = sub_type_cc
    result["use"] = fhir_enum(model.use)
    patient_ref = _fhir_ref(model.patient_type, model.patient_id, model.patient_display)
    if patient_ref:
        result["patient"] = patient_ref
    if model.billable_period_start or model.billable_period_end:
        result["billablePeriod"] = {k: v for k, v in {
            "start": model.billable_period_start.isoformat() if model.billable_period_start else None,
            "end": model.billable_period_end.isoformat() if model.billable_period_end else None,
        }.items() if v}
    result["created"] = model.created.isoformat()
    enterer_ref = _fhir_ref(model.enterer_type, model.enterer_id, model.enterer_display)
    if enterer_ref:
        result["enterer"] = enterer_ref
    insurer_ref = _fhir_ref(model.insurer_type, model.insurer_id, model.insurer_display)
    if insurer_ref:
        result["insurer"] = insurer_ref
    provider_ref = _fhir_ref(model.provider_type, model.provider_id, model.provider_display)
    if provider_ref:
        result["provider"] = provider_ref
    priority_cc = _fhir_cc(model.priority_system, model.priority_code, model.priority_display, model.priority_text)
    if priority_cc:
        result["priority"] = priority_cc
    funds_cc = _fhir_cc(model.funds_reserve_system, model.funds_reserve_code, model.funds_reserve_display, model.funds_reserve_text)
    if funds_cc:
        result["fundsReserve"] = funds_cc
    if model.related:
        result["related"] = [fhir_claim_related(r) for r in model.related]
    prescription_ref = _fhir_ref(model.prescription_type, model.prescription_id, model.prescription_display)
    if prescription_ref:
        result["prescription"] = prescription_ref
    orig_rx_ref = _fhir_ref(model.original_prescription_type, model.original_prescription_id, model.original_prescription_display)
    if orig_rx_ref:
        result["originalPrescription"] = orig_rx_ref
    payee_type_cc = _fhir_cc(model.payee_type_system, model.payee_type_code, model.payee_type_display, model.payee_type_text)
    payee_party_ref = _fhir_ref(model.payee_party_type, model.payee_party_id, model.payee_party_display)
    if payee_type_cc or payee_party_ref:
        payee: dict = {}
        if payee_type_cc:
            payee["type"] = payee_type_cc
        if payee_party_ref:
            payee["party"] = payee_party_ref
        result["payee"] = payee
    referral_ref = _fhir_ref(model.referral_type, model.referral_id, model.referral_display)
    if referral_ref:
        result["referral"] = referral_ref
    facility_ref = _fhir_ref(model.facility_type, model.facility_id, model.facility_display)
    if facility_ref:
        result["facility"] = facility_ref
    if model.care_team:
        result["careTeam"] = [fhir_claim_care_team(ct) for ct in model.care_team]
    if model.supporting_info:
        result["supportingInfo"] = [fhir_claim_supporting_info(si) for si in model.supporting_info]
    if model.diagnoses:
        result["diagnosis"] = [fhir_claim_diagnosis(d) for d in model.diagnoses]
    if model.procedures:
        result["procedure"] = [fhir_claim_procedure(p) for p in model.procedures]
    if model.insurance:
        result["insurance"] = [fhir_claim_insurance(ins) for ins in model.insurance]
    if model.accident_date or model.accident_type_code:
        accident: dict = {}
        if model.accident_date:
            accident["date"] = model.accident_date.isoformat()
        acc_type_cc = _fhir_cc(model.accident_type_system, model.accident_type_code, model.accident_type_display, model.accident_type_text)
        if acc_type_cc:
            accident["type"] = acc_type_cc
        if model.accident_location_address_use or model.accident_location_address_city or model.accident_location_address_line:
            addr: dict = {}
            if model.accident_location_address_use:
                addr["use"] = model.accident_location_address_use
            if model.accident_location_address_type:
                addr["type"] = model.accident_location_address_type
            if model.accident_location_address_text:
                addr["text"] = model.accident_location_address_text
            lines = fhir_split(model.accident_location_address_line)
            if lines:
                addr["line"] = lines
            if model.accident_location_address_city:
                addr["city"] = model.accident_location_address_city
            if model.accident_location_address_district:
                addr["district"] = model.accident_location_address_district
            if model.accident_location_address_state:
                addr["state"] = model.accident_location_address_state
            if model.accident_location_address_postal_code:
                addr["postalCode"] = model.accident_location_address_postal_code
            if model.accident_location_address_country:
                addr["country"] = model.accident_location_address_country
            if model.accident_location_address_period_start or model.accident_location_address_period_end:
                addr["period"] = {k: v for k, v in {
                    "start": model.accident_location_address_period_start.isoformat() if model.accident_location_address_period_start else None,
                    "end": model.accident_location_address_period_end.isoformat() if model.accident_location_address_period_end else None,
                }.items() if v}
            accident["locationAddress"] = addr
        loc_ref = _fhir_ref(model.accident_location_reference_type, model.accident_location_reference_id, model.accident_location_reference_display)
        if loc_ref:
            accident["locationReference"] = loc_ref
        result["accident"] = accident
    if model.items:
        result["item"] = [fhir_claim_item(i) for i in model.items]
    total = _fhir_money(model.total_value, model.total_currency)
    if total:
        result["total"] = total
    return {k: v for k, v in result.items() if v is not None}

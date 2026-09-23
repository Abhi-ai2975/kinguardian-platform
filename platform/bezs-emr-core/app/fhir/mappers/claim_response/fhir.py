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


def _fhir_note_numbers(comma_sep_text):
    parts = fhir_split(comma_sep_text)
    return [int(x) for x in parts] if parts else None


def _fhir_adjudication(adj) -> dict:
    entry: dict = {}
    cat_cc = _fhir_cc(adj.category_system, adj.category_code, adj.category_display, adj.category_text)
    if cat_cc:
        entry["category"] = cat_cc
    reason_cc = _fhir_cc(adj.reason_system, adj.reason_code, adj.reason_display, adj.reason_text)
    if reason_cc:
        entry["reason"] = reason_cc
    amount = _fhir_money(adj.amount_value, adj.amount_currency)
    if amount:
        entry["amount"] = amount
    if adj.adj_value is not None:
        entry["value"] = float(adj.adj_value)
    return entry


def fhir_cr_identifier(i) -> dict:
    return fhir_identifier(i)


def fhir_cr_item_detail_sub_detail(sd) -> dict:
    entry: dict = {"subDetailSequence": sd.sub_detail_sequence}
    nn = _fhir_note_numbers(sd.note_number)
    if nn:
        entry["noteNumber"] = nn
    if sd.adjudications:
        entry["adjudication"] = [_fhir_adjudication(a) for a in sd.adjudications]
    return entry


def fhir_cr_item_detail(d) -> dict:
    entry: dict = {"detailSequence": d.detail_sequence}
    nn = _fhir_note_numbers(d.note_number)
    if nn:
        entry["noteNumber"] = nn
    if d.adjudications:
        entry["adjudication"] = [_fhir_adjudication(a) for a in d.adjudications]
    if d.sub_details:
        entry["subDetail"] = [fhir_cr_item_detail_sub_detail(sd) for sd in d.sub_details]
    return entry


def fhir_cr_item(item) -> dict:
    entry: dict = {"itemSequence": item.item_sequence}
    nn = _fhir_note_numbers(item.note_number)
    if nn:
        entry["noteNumber"] = nn
    if item.adjudications:
        entry["adjudication"] = [_fhir_adjudication(a) for a in item.adjudications]
    if item.details:
        entry["detail"] = [fhir_cr_item_detail(d) for d in item.details]
    return entry


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


def fhir_cr_add_item_detail_sub_detail(sd) -> dict:
    entry: dict = {}
    pos_cc = _fhir_cc(sd.product_or_service_system, sd.product_or_service_code, sd.product_or_service_display, sd.product_or_service_text)
    if pos_cc:
        entry["productOrService"] = pos_cc
    if sd.modifiers:
        mods = _fhir_cc_list(sd.modifiers)
        if mods:
            entry["modifier"] = mods
    qty = _fhir_quantity(sd.quantity_value, sd.quantity_unit, sd.quantity_system, sd.quantity_code)
    if qty:
        entry["quantity"] = qty
    up = _fhir_money(sd.unit_price_value, sd.unit_price_currency)
    if up:
        entry["unitPrice"] = up
    if sd.factor is not None:
        entry["factor"] = float(sd.factor)
    net = _fhir_money(sd.net_value, sd.net_currency)
    if net:
        entry["net"] = net
    nn = _fhir_note_numbers(sd.note_number)
    if nn:
        entry["noteNumber"] = nn
    if sd.adjudications:
        entry["adjudication"] = [_fhir_adjudication(a) for a in sd.adjudications]
    return entry


def fhir_cr_add_item_detail(d) -> dict:
    entry: dict = {}
    pos_cc = _fhir_cc(d.product_or_service_system, d.product_or_service_code, d.product_or_service_display, d.product_or_service_text)
    if pos_cc:
        entry["productOrService"] = pos_cc
    if d.modifiers:
        mods = _fhir_cc_list(d.modifiers)
        if mods:
            entry["modifier"] = mods
    qty = _fhir_quantity(d.quantity_value, d.quantity_unit, d.quantity_system, d.quantity_code)
    if qty:
        entry["quantity"] = qty
    up = _fhir_money(d.unit_price_value, d.unit_price_currency)
    if up:
        entry["unitPrice"] = up
    if d.factor is not None:
        entry["factor"] = float(d.factor)
    net = _fhir_money(d.net_value, d.net_currency)
    if net:
        entry["net"] = net
    nn = _fhir_note_numbers(d.note_number)
    if nn:
        entry["noteNumber"] = nn
    if d.adjudications:
        entry["adjudication"] = [_fhir_adjudication(a) for a in d.adjudications]
    if d.sub_details:
        entry["subDetail"] = [fhir_cr_add_item_detail_sub_detail(sd) for sd in d.sub_details]
    return entry


def fhir_cr_add_item(ai) -> dict:
    entry: dict = {}
    is_seq = _fhir_note_numbers(ai.item_sequence)
    if is_seq:
        entry["itemSequence"] = is_seq
    ds_seq = _fhir_note_numbers(ai.detail_sequence)
    if ds_seq:
        entry["detailSequence"] = ds_seq
    sd_seq = _fhir_note_numbers(ai.subdetail_sequence)
    if sd_seq:
        entry["subdetailSequence"] = sd_seq
    if ai.providers:
        entry["provider"] = [_fhir_ref(p.reference_type, p.reference_id, p.reference_display) for p in ai.providers if p.reference_id is not None]
    pos_cc = _fhir_cc(ai.product_or_service_system, ai.product_or_service_code, ai.product_or_service_display, ai.product_or_service_text)
    if pos_cc:
        entry["productOrService"] = pos_cc
    if ai.modifiers:
        mods = _fhir_cc_list(ai.modifiers)
        if mods:
            entry["modifier"] = mods
    if ai.program_codes:
        pcs = _fhir_cc_list(ai.program_codes)
        if pcs:
            entry["programCode"] = pcs
    if ai.serviced_date:
        entry["servicedDate"] = ai.serviced_date.isoformat()
    if ai.serviced_period_start or ai.serviced_period_end:
        entry["servicedPeriod"] = {k: v for k, v in {
            "start": ai.serviced_period_start.isoformat() if ai.serviced_period_start else None,
            "end": ai.serviced_period_end.isoformat() if ai.serviced_period_end else None,
        }.items() if v}
    loc_cc = _fhir_cc(ai.location_cc_system, ai.location_cc_code, ai.location_cc_display, ai.location_cc_text)
    if loc_cc:
        entry["locationCodeableConcept"] = loc_cc
    if ai.location_address_use or ai.location_address_city or ai.location_address_line:
        addr: dict = {}
        if ai.location_address_use:
            addr["use"] = ai.location_address_use
        if ai.location_address_type:
            addr["type"] = ai.location_address_type
        if ai.location_address_text:
            addr["text"] = ai.location_address_text
        lines = fhir_split(ai.location_address_line)
        if lines:
            addr["line"] = lines
        if ai.location_address_city:
            addr["city"] = ai.location_address_city
        if ai.location_address_district:
            addr["district"] = ai.location_address_district
        if ai.location_address_state:
            addr["state"] = ai.location_address_state
        if ai.location_address_postal_code:
            addr["postalCode"] = ai.location_address_postal_code
        if ai.location_address_country:
            addr["country"] = ai.location_address_country
        entry["locationAddress"] = addr
    loc_ref = _fhir_ref(ai.location_ref_type, ai.location_ref_id, ai.location_ref_display)
    if loc_ref:
        entry["locationReference"] = loc_ref
    qty = _fhir_quantity(ai.quantity_value, ai.quantity_unit, ai.quantity_system, ai.quantity_code)
    if qty:
        entry["quantity"] = qty
    up = _fhir_money(ai.unit_price_value, ai.unit_price_currency)
    if up:
        entry["unitPrice"] = up
    if ai.factor is not None:
        entry["factor"] = float(ai.factor)
    net = _fhir_money(ai.net_value, ai.net_currency)
    if net:
        entry["net"] = net
    bs_cc = _fhir_cc(ai.body_site_system, ai.body_site_code, ai.body_site_display, ai.body_site_text)
    if bs_cc:
        entry["bodySite"] = bs_cc
    if ai.sub_sites:
        ss = _fhir_cc_list(ai.sub_sites)
        if ss:
            entry["subSite"] = ss
    nn = _fhir_note_numbers(ai.note_number)
    if nn:
        entry["noteNumber"] = nn
    if ai.adjudications:
        entry["adjudication"] = [_fhir_adjudication(a) for a in ai.adjudications]
    if ai.details:
        entry["detail"] = [fhir_cr_add_item_detail(d) for d in ai.details]
    return entry


def fhir_cr_total(t) -> dict:
    entry: dict = {}
    cat_cc = _fhir_cc(t.category_system, t.category_code, t.category_display, t.category_text)
    if cat_cc:
        entry["category"] = cat_cc
    amount = _fhir_money(t.amount_value, t.amount_currency)
    if amount:
        entry["amount"] = amount
    return entry


def fhir_cr_process_note(n) -> dict:
    entry: dict = {}
    if n.number is not None:
        entry["number"] = n.number
    if n.note_type:
        entry["type"] = n.note_type
    if n.text:
        entry["text"] = n.text
    lang_cc = _fhir_cc(n.language_system, n.language_code, n.language_display, n.language_text)
    if lang_cc:
        entry["language"] = lang_cc
    return entry


def fhir_cr_communication_request(cr) -> dict:
    return _fhir_ref(cr.reference_type, cr.reference_id, cr.reference_display)


def fhir_cr_insurance(ins) -> dict:
    entry: dict = {}
    if ins.sequence is not None:
        entry["sequence"] = ins.sequence
    if ins.focal is not None:
        entry["focal"] = ins.focal
    cov_ref = _fhir_ref(ins.coverage_type, ins.coverage_id, ins.coverage_display)
    if cov_ref:
        entry["coverage"] = cov_ref
    if ins.business_arrangement:
        entry["businessArrangement"] = ins.business_arrangement
    cr_ref = _fhir_ref(ins.claim_response_ref_type, ins.claim_response_ref_id, ins.claim_response_ref_display)
    if cr_ref:
        entry["claimResponse"] = cr_ref
    return entry


def fhir_cr_error(e) -> dict:
    entry: dict = {}
    if e.item_sequence is not None:
        entry["itemSequence"] = e.item_sequence
    if e.detail_sequence is not None:
        entry["detailSequence"] = e.detail_sequence
    if e.sub_detail_sequence is not None:
        entry["subDetailSequence"] = e.sub_detail_sequence
    code_cc = _fhir_cc(e.code_system, e.code_code, e.code_display, e.code_text)
    if code_cc:
        entry["code"] = code_cc
    return entry


def to_fhir_claim_response(model) -> dict:
    result: dict = {
        "resourceType": "ClaimResponse",
        "id": str(model.claim_response_id),
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
    result["created"] = model.created.isoformat()
    insurer_ref = _fhir_ref(model.insurer_type, model.insurer_id, model.insurer_display)
    if insurer_ref:
        result["insurer"] = insurer_ref
    requestor_ref = _fhir_ref(model.requestor_type, model.requestor_id, model.requestor_display)
    if requestor_ref:
        result["requestor"] = requestor_ref
    request_ref = _fhir_ref(model.request_type, model.request_id, model.request_display)
    if request_ref:
        result["request"] = request_ref
    result["outcome"] = fhir_enum(model.outcome)
    if model.disposition:
        result["disposition"] = model.disposition
    if model.pre_auth_ref:
        result["preAuthRef"] = model.pre_auth_ref
    if model.pre_auth_period_start or model.pre_auth_period_end:
        result["preAuthPeriod"] = {k: v for k, v in {
            "start": model.pre_auth_period_start.isoformat() if model.pre_auth_period_start else None,
            "end": model.pre_auth_period_end.isoformat() if model.pre_auth_period_end else None,
        }.items() if v}
    payee_type_cc = _fhir_cc(model.payee_type_system, model.payee_type_code, model.payee_type_display, model.payee_type_text)
    if payee_type_cc:
        result["payeeType"] = payee_type_cc
    if model.items:
        result["item"] = [fhir_cr_item(i) for i in model.items]
    if model.add_items:
        result["addItem"] = [fhir_cr_add_item(ai) for ai in model.add_items]
    if model.adjudications:
        result["adjudication"] = [_fhir_adjudication(a) for a in model.adjudications]
    if model.totals:
        result["total"] = [fhir_cr_total(t) for t in model.totals]
    # payment
    if model.payment_type_code or model.payment_amount_value is not None:
        payment: dict = {}
        pay_type_cc = _fhir_cc(model.payment_type_system, model.payment_type_code, model.payment_type_display, model.payment_type_text)
        if pay_type_cc:
            payment["type"] = pay_type_cc
        adj_amount = _fhir_money(model.payment_adjustment_value, model.payment_adjustment_currency)
        if adj_amount:
            payment["adjustment"] = adj_amount
        adj_reason_cc = _fhir_cc(model.payment_adjustment_reason_system, model.payment_adjustment_reason_code, model.payment_adjustment_reason_display, model.payment_adjustment_reason_text)
        if adj_reason_cc:
            payment["adjustmentReason"] = adj_reason_cc
        if model.payment_date:
            payment["date"] = model.payment_date.isoformat()
        pay_amount = _fhir_money(model.payment_amount_value, model.payment_amount_currency)
        if pay_amount:
            payment["amount"] = pay_amount
        pay_id: dict = {}
        if model.payment_identifier_use:
            pay_id["use"] = model.payment_identifier_use
        if model.payment_identifier_system:
            pay_id["system"] = model.payment_identifier_system
        if model.payment_identifier_value:
            pay_id["value"] = model.payment_identifier_value
        if pay_id:
            payment["identifier"] = pay_id
        if payment:
            result["payment"] = payment
    funds_cc = _fhir_cc(model.funds_reserve_system, model.funds_reserve_code, model.funds_reserve_display, model.funds_reserve_text)
    if funds_cc:
        result["fundsReserve"] = funds_cc
    form_code_cc = _fhir_cc(model.form_code_system, model.form_code_code, model.form_code_display, model.form_code_text)
    if form_code_cc:
        result["formCode"] = form_code_cc
    if model.form_content_type or model.form_url or model.form_data:
        form: dict = {}
        if model.form_content_type:
            form["contentType"] = model.form_content_type
        if model.form_language:
            form["language"] = model.form_language
        if model.form_data:
            form["data"] = model.form_data
        if model.form_url:
            form["url"] = model.form_url
        if model.form_size:
            form["size"] = model.form_size
        if model.form_hash:
            form["hash"] = model.form_hash
        if model.form_title:
            form["title"] = model.form_title
        if model.form_creation:
            form["creation"] = model.form_creation.isoformat()
        result["form"] = form
    if model.process_notes:
        result["processNote"] = [fhir_cr_process_note(n) for n in model.process_notes]
    if model.communication_requests:
        cr_refs = [fhir_cr_communication_request(cr) for cr in model.communication_requests if cr.reference_id is not None]
        if cr_refs:
            result["communicationRequest"] = cr_refs
    if model.insurances:
        result["insurance"] = [fhir_cr_insurance(ins) for ins in model.insurances]
    if model.errors:
        result["error"] = [fhir_cr_error(e) for e in model.errors]
    return {k: v for k, v in result.items() if v is not None}

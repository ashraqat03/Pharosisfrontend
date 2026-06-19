"""
PharmoScan — Flask Backend
Loads the voting ensemble and serves predictions via /predict
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import numpy as np
import os

# ── RDKit ────────────────────────────────────────────────────
from rdkit import Chem
from rdkit.Chem import Descriptors, rdMolDescriptors, MACCSkeys
from rdkit.Chem.Pharm2D import Generate
from rdkit.Chem.Pharm2D.SigFactory import SigFactory
from rdkit import RDLogger
from rdkit.Chem import ChemicalFeatures
from rdkit.Chem import rdFingerprintGenerator
from itertools import combinations

RDLogger.DisableLog("rdApp.*")

app = Flask(__name__)
CORS(app)

# ── Load ensemble ────────────────────────────────────────────
print("Loading ensemble...")
ensemble = joblib.load("voting_ensemble.pkl")

model_all     = ensemble["model_all"]
model_spatial = ensemble["model_spatial"]
feat_cols_all = ensemble["feat_cols_all"]
feat_cols_sp  = ensemble["feat_cols_spatial"]
label_map_inv = ensemble["label_map_inv"]   # {0: 'PDE4B only', 1: 'NE only', 2: 'PDE4B + NE (Dual)'}
W_ALL         = ensemble["w_all"]           # 0.7
W_SP          = ensemble["w_spatial"]       # 0.3
print(f"Ensemble loaded ✓  weights: {W_ALL}/{W_SP}")

# ── Rebuild SigFactory (same as Step 5 / Step 6) ─────────────
GOBBI_FDEF = """
AtomType NDonor [N;!H0;v3,v4&+1]
AtomType ChalcDonor [O,S;H1;+0]
DefineFeature SingleAtomDonor [{NDonor},{ChalcDonor}]
  Family HBDonor
  Weights 1
EndFeature

AtomType NAcceptor [$([N;H0;$(N(~[!#1])(~[!#1])~[!#1])])]
AtomType NAcceptor2 [n;H0;+0]
AtomType OAcceptor [O;H0;+0]
DefineFeature SingleAtomAcceptor [{NAcceptor},{NAcceptor2},{OAcceptor}]
  Family HBAcceptor
  Weights 1
EndFeature

DefineFeature AcidicGroup [C,S](=[O,S,P])-[O;H1,H0&-1]
  Family NegIonizable
  Weights 1.0,1.0,1.0
EndFeature

DefineFeature BasicGroup [N;H1&+0,H2&+0]!@[!N]
  Family PosIonizable
  Weights 1.0,1.0
EndFeature

AtomType Carbon_Aromatic [c]
AtomType Carbon_NonPolar [C;H0&r3&!$(CC(=O)N)&!$(CC(=O)O),$([CH,CH2;r3])]
DefineFeature Hydrophobe [{Carbon_Aromatic},{Carbon_NonPolar}]
  Family Hydrophobe
  Weights 1.0
EndFeature

AtomType AromN [n]
AtomType AromC [c]
DefineFeature Aromatic [{AromN},{AromC}]
  Family Aromatic
  Weights 1.0
EndFeature
"""

_fdef_path = "/tmp/gobbi.fdef"
with open(_fdef_path, "w") as f:
    f.write(GOBBI_FDEF)

_feat_factory = ChemicalFeatures.BuildFeatureFactory(_fdef_path)
_sig_factory  = SigFactory(_feat_factory, minPointCount=2, maxPointCount=3)
_sig_factory.SetBins([(0, 2), (2, 5), (5, 8)])
_sig_factory.Init()

_test_mol     = Chem.MolFromSmiles("c1ccccc1")
PHARM_FP_SIZE = len(Generate.Gen2DFingerprint(_test_mol, _sig_factory))

_morgan_gen   = rdFingerprintGenerator.GetMorganGenerator(radius=2, fpSize=2048)
FEATURE_TYPES = ["HBD", "HBA", "Hyd", "Aro", "PosI", "NegI"]

print(f"SigFactory ready — PharmFP size: {PHARM_FP_SIZE} ✓")


# ── Feature extraction (mirrors Step 5 Cell 9) ───────────────
def get_molecular_features(smiles):
    mol = Chem.MolFromSmiles(str(smiles))
    if mol is None:
        return None

    features = {}

    # A. ECFP4
    ecfp4 = _morgan_gen.GetFingerprint(mol)
    for i, bit in enumerate(ecfp4):
        features[f"ECFP4_{i}"] = int(bit)

    # B. MACCS
    maccs = MACCSkeys.GenMACCSKeys(mol)
    for i, bit in enumerate(maccs):
        features[f"MACCS_{i}"] = int(bit)

    # C. Physicochemical
    features["MW"]            = Descriptors.MolWt(mol)
    features["LogP"]          = Descriptors.MolLogP(mol)
    features["HBD"]           = rdMolDescriptors.CalcNumHBD(mol)
    features["HBA"]           = rdMolDescriptors.CalcNumHBA(mol)
    features["TPSA"]          = Descriptors.TPSA(mol)
    features["RotBonds"]      = rdMolDescriptors.CalcNumRotatableBonds(mol)
    features["AromaticRings"] = rdMolDescriptors.CalcNumAromaticRings(mol)
    features["Rings"]         = rdMolDescriptors.CalcNumRings(mol)
    features["HeavyAtoms"]    = mol.GetNumHeavyAtoms()
    features["QED"]           = Descriptors.qed(mol)

    # D. 2D Pharmacophore
    try:
        pharm_fp = Generate.Gen2DFingerprint(mol, _sig_factory)
        for i, bit in enumerate(pharm_fp):
            features[f"PharmFP_{i}"] = int(bit)
    except Exception:
        for i in range(PHARM_FP_SIZE):
            features[f"PharmFP_{i}"] = 0

    # E. Spatial features (zeros for new molecules — no 3D conformer)
    for f1, f2 in combinations(FEATURE_TYPES, 2):
        features[f"sp_dist_{f1}_{f2}"] = 0.0
    for ft in FEATURE_TYPES:
        features[f"sp_n_{ft}"] = 0.0

    return features


def features_to_arrays(feat_dict):
    """Convert feature dict → (X_all, X_spatial) numpy arrays."""
    all_vals     = [feat_dict.get(c, 0.0) for c in feat_cols_all]
    spatial_vals = [feat_dict.get(c, 0.0) for c in feat_cols_sp]
    return (
        np.array(all_vals,     dtype=np.float32).reshape(1, -1),
        np.array(spatial_vals, dtype=np.float32).reshape(1, -1),
    )


# ── Routes ───────────────────────────────────────────────────
@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "model": "PharmoScan voting ensemble"})


@app.route("/predict", methods=["POST"])
def predict():
    body = request.get_json(silent=True)
    if not body or "smiles" not in body:
        return jsonify({"error": "Missing 'smiles' in request body"}), 400

    smiles = body["smiles"].strip()
    if not smiles:
        return jsonify({"error": "Empty SMILES string"}), 400

    # Validate SMILES
    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        return jsonify({"error": "Invalid SMILES string — could not parse molecule"}), 422

    # Extract features
    feat_dict = get_molecular_features(smiles)
    if feat_dict is None:
        return jsonify({"error": "Feature extraction failed"}), 500

    X_all, X_sp = features_to_arrays(feat_dict)

    # Inference
    pa = model_all.predict_proba(X_all)[0]      # shape (3,)
    ps = model_spatial.predict_proba(X_sp)[0]   # shape (3,)
    pe = W_ALL * pa + W_SP * ps                 # ensemble

    pred_idx = int(np.argmax(pe))
    pred_all = int(np.argmax(pa))
    pred_sp  = int(np.argmax(ps))

    class_names = [label_map_inv[i] for i in range(3)]

    return jsonify({
        # Ensemble
        "prediction"          : label_map_inv[pred_idx],
        "confidence_pct"      : round(float(pe[pred_idx]) * 100, 1),
        "ensemble_probs"      : {class_names[i]: round(float(pe[i]), 4) for i in range(3)},
        # Model A
        "model_all_pred"      : label_map_inv[pred_all],
        "model_all_confidence": round(float(pa[pred_all]), 4),
        "model_all_probs"     : {class_names[i]: round(float(pa[i]), 4) for i in range(3)},
        # Model B
        "model_spatial_pred"      : label_map_inv[pred_sp],
        "model_spatial_confidence": round(float(ps[pred_sp]), 4),
        "model_spatial_probs"     : {class_names[i]: round(float(ps[i]), 4) for i in range(3)},
        # Agreement
        "models_agree": pred_all == pred_sp,
        "smiles"      : smiles,
    })


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)

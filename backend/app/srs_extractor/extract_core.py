import os
import numpy as np
from typing import Optional

from .common import read_all_bytes, FRAME_MARKER_HEX
from .time_axis import extract_time_axis
from .spectra_matrix import extract_spectra_matrix
from .bg_fast import detect_payloads_by_markers, extract_background_matrix
from .bg_realtime import extract_background_first


def run_extraction(srs_path: str, mode: str = "fast", outdir: str = "output", start_wn: Optional[float] = None, end_wn: Optional[float] = None):
    srs = read_all_bytes(srs_path)
    os.makedirs(outdir, exist_ok=True)
    marker = bytes.fromhex(FRAME_MARKER_HEX)
    print(f"文件大小: {len(srs):,} bytes")
    print(f"运行模式: {mode}")

    # Step 1: 时间轴 + 帧位置
    time_axis, frame_positions = extract_time_axis(srs, marker,mode)
    if len(frame_positions) < 2:
        print("帧标记不足，终止")
        return

    # Step 2: 光谱矩阵
    payload_offset = 80 if mode == "fast" else 84
    spectra = extract_spectra_matrix(srs, frame_positions, payload_offset)
    if spectra is None:
        return

    # Step 3: 波数轴
    if start_wn is None or end_wn is None:
        try:
            start_wn = float(input("请输入波数起点(cm⁻¹): ").strip())
            end_wn = float(input("请输入波数终点(cm⁻¹): ").strip())
        except Exception:
            print("波数输入无效。终止")
            return
    wn_axis = np.linspace(start_wn, end_wn, spectra.shape[1])

    # Step 4: 保存时间序列光谱
    base_name = os.path.splitext(os.path.basename(srs_path))[0]
    out_ts = os.path.join(outdir, f"{base_name}.txt")
    if time_axis is not None and len(time_axis) >= spectra.shape[0]:
        data_with_time = np.column_stack((time_axis[: spectra.shape[0]], spectra))
        header = "\t" + "\t".join(f"{x:.6f}" for x in wn_axis)
        np.savetxt(out_ts, data_with_time, delimiter="\t", header=header, comments="", encoding="utf-8")
    else:
        header = "\t".join(f"{x:.6f}" for x in wn_axis)
        np.savetxt(out_ts, spectra, delimiter="\t", header=header,comments="", encoding="utf-8")
    print(f"[OK] 已保存时间分辨光谱: {out_ts}")
    # Step 5: 背景
    if mode == "fast":
        bg_offsets = detect_payloads_by_markers(srs)
        if not bg_offsets:
            print("未找到背景标记，尝试按间隔扫描 (fallback)")
            first_guess = 0
            BG_INTERVAL_BYTES = 9040
            while first_guess < len(srs) - 10 * BG_INTERVAL_BYTES:
                arr = np.frombuffer(srs, dtype=np.float32, count=1024, offset=first_guess)
                if np.isfinite(arr).all() and np.std(arr) > 1e-6:
                    bg_offsets = [first_guess + i * BG_INTERVAL_BYTES for i in range(3)]
                    break
                first_guess += 512
        if bg_offsets:
            print("定位到背景 payload 起点:")
            for i, p in enumerate(bg_offsets, 1):
                print(f"  BG#{i} @SRS {p}")
        bg_matrix = extract_background_matrix(srs, bg_offsets, spectra.shape[1])
    else:
        bg_matrix, _ = extract_background_first(
            srs,
            target_npts=spectra.shape[1],
            interval_bytes=9040,
            offset_adjust=-404,
            scan_step=512,
        )

    if bg_matrix is not None:
        out_bg = os.path.join(outdir, f"{base_name}_bg.txt")
        header = "wavenumber" + "".join([f"\tbg{i+1}" for i in range(bg_matrix.shape[0])])
        out_mat = np.column_stack([wn_axis, bg_matrix.T])
        np.savetxt(out_bg, out_mat, delimiter="\t", header=header,
                   comments="", encoding="utf-8")
        print(f"[OK] 已保存背景文件: {out_bg}")
    else:
        print("[WARN] 未导出背景文件")
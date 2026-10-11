"""Cap onnxruntime's thread pool (Piper doesn't expose it): ORT_THREADS=n sets intra-op threads, no spin-waiting.

By default ORT starts one spinning thread per core it sees, so many parallel Piper workers swamp the CPU.
"""
import os

import onnxruntime as ort

if n := int(os.environ.get("ORT_THREADS", "0")):
    _Session = ort.InferenceSession

    class _Capped(_Session):
        def __init__(self, path, sess_options=None, *a, **kw):
            sess_options = sess_options or ort.SessionOptions()
            sess_options.intra_op_num_threads = n
            sess_options.inter_op_num_threads = 1
            sess_options.add_session_config_entry("session.intra_op.allow_spinning", "0")
            super().__init__(path, sess_options, *a, **kw)

    ort.InferenceSession = _Capped

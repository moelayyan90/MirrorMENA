const BASE = 'https://yce-api-01.makeupar.com';

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

function safeString(value, max = 300) {
  return typeof value === 'string' ? value.slice(0, max) : '';
}

function normalizeContentType(type, name = '') {
  const lower = (type || '').toLowerCase();
  const filename = (name || '').toLowerCase();
  if (lower === 'image/png' || filename.endsWith('.png')) return 'image/png';
  if (lower === 'image/jpg' || lower === 'image/jpeg' || filename.endsWith('.jpg') || filename.endsWith('.jpeg')) return 'image/jpg';
  throw new Error('Only JPG/JPEG and PNG images are supported.');
}

async function perfect(path, options = {}) {
  const key = process.env.YOUCAM_API_KEY;
  if (!key) throw new Error('Server configuration is missing YOUCAM_API_KEY.');

  const response = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  let payload;
  const text = await response.text();
  try { payload = text ? JSON.parse(text) : {}; } catch { payload = { raw: text }; }

  if (!response.ok) {
    const detail = payload?.error?.message || payload?.message || payload?.error || `YouCam API returned HTTP ${response.status}`;
    const err = new Error(typeof detail === 'string' ? detail : JSON.stringify(detail));
    err.status = response.status;
    err.payload = payload;
    throw err;
  }

  return payload;
}

function validateUploadFiles(files) {
  if (!Array.isArray(files) || files.length < 1 || files.length > 2) {
    throw new Error('Invalid upload request.');
  }

  return files.map((file) => {
    const fileName = safeString(file?.file_name, 150) || 'image.jpg';
    const fileSize = Number(file?.file_size);
    if (!Number.isFinite(fileSize) || fileSize <= 0 || fileSize >= 10 * 1024 * 1024) {
      throw new Error('Each image must be smaller than 10 MB.');
    }
    return {
      file_name: fileName,
      file_size: fileSize,
      content_type: normalizeContentType(file?.content_type, fileName)
    };
  });
}

module.exports = async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const action = safeString(req.query?.action, 40);
      const taskId = safeString(req.query?.task_id, 300);
      if (!taskId) return json(res, 400, { ok: false, error: 'Missing task_id.' });

      if (action === 'skin-status') {
        const data = await perfect(`/s2s/v2.1/task/skin-analysis/${encodeURIComponent(taskId)}`, { method: 'GET' });
        return json(res, 200, { ok: true, data });
      }

      if (action === 'cloth-status') {
        const data = await perfect(`/s2s/v2.0/task/cloth-v3/${encodeURIComponent(taskId)}`, { method: 'GET' });
        return json(res, 200, { ok: true, data });
      }

      return json(res, 400, { ok: false, error: 'Unknown action.' });
    }

    if (req.method !== 'POST') {
      res.setHeader('Allow', 'GET, POST');
      return json(res, 405, { ok: false, error: 'Method not allowed.' });
    }

    const body = req.body || {};
    const action = safeString(body.action, 40);

    if (action === 'prepare-upload') {
      const feature = body.feature === 'skin' ? 'skin' : body.feature === 'cloth' ? 'cloth' : null;
      if (!feature) return json(res, 400, { ok: false, error: 'Invalid feature.' });
      const files = validateUploadFiles(body.files);
      const path = feature === 'skin'
        ? '/s2s/v2.1/file/skin-analysis'
        : '/s2s/v2.0/file/cloth-v3';
      const data = await perfect(path, {
        method: 'POST',
        body: JSON.stringify({ files })
      });
      return json(res, 200, { ok: true, data });
    }

    if (action === 'start-skin') {
      const srcFileId = safeString(body.src_file_id, 500);
      if (!srcFileId) return json(res, 400, { ok: false, error: 'Missing source file ID.' });
      const data = await perfect('/s2s/v2.1/task/skin-analysis', {
        method: 'POST',
        body: JSON.stringify({
          src_file_id: srcFileId,
          dst_actions: ['hd_wrinkle', 'hd_pore', 'hd_texture', 'hd_acne'],
          miniserver_args: {
            enable_mask_overlay: true,
            enable_dark_background_hd_pore: true,
            color_dark_background_hd_pore: '3D3D3D',
            opacity_dark_background_hd_pore: 0.4,
            enable_dark_background_hd_wrinkle: true,
            color_dark_background_hd_wrinkle: '3D3D3D',
            opacity_dark_background_hd_wrinkle: 0.4
          },
          format: 'json'
        })
      });
      return json(res, 200, { ok: true, data });
    }

    if (action === 'start-cloth') {
      const srcFileId = safeString(body.src_file_id, 500);
      const refFileId = safeString(body.ref_file_id, 500);
      if (!srcFileId || !refFileId) return json(res, 400, { ok: false, error: 'Missing source or garment file ID.' });
      const data = await perfect('/s2s/v2.0/task/cloth-v3', {
        method: 'POST',
        body: JSON.stringify({
          src_file_id: srcFileId,
          ref_file_id: refFileId,
          garment_category: 'full_body'
        })
      });
      return json(res, 200, { ok: true, data });
    }

    return json(res, 400, { ok: false, error: 'Unknown action.' });
  } catch (error) {
    const status = error?.status && error.status >= 400 && error.status < 600 ? error.status : 500;
    return json(res, status, {
      ok: false,
      error: error?.message || 'Unexpected server error.',
      upstream: error?.payload || undefined
    });
  }
};

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

async function verifyTurnstileToken(token, remoteIp) {
  const secretKey = process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY;

  if (!secretKey) {
    return {
      success: false,
      message: 'Captcha belum dikonfigurasi. Hubungi admin.'
    };
  }

  if (!token) {
    return {
      success: false,
      message: 'Captcha wajib diisi.'
    };
  }

  const params = new URLSearchParams();
  params.append('secret', secretKey);
  params.append('response', token);

  if (remoteIp) {
    params.append('remoteip', remoteIp);
  }

  const response = await fetch(TURNSTILE_VERIFY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params.toString()
  });

  if (!response.ok) {
    throw new Error('Turnstile verification request failed');
  }

  const result = await response.json();

  if (!result.success) {
    return {
      success: false,
      message: 'Verifikasi captcha gagal. Silakan coba lagi.'
    };
  }

  return { success: true };
}

module.exports = {
  verifyTurnstileToken
};

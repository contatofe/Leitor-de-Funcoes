export async function recognize(blob) {
  const form = new FormData();
  form.append("photo", blob, "photo.jpg");

  const response = await fetch("/api/recognize", {
    method: "POST",
    body: form,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.detail || `O servidor respondeu ${response.status}.`);
  }
  return response.json();
}

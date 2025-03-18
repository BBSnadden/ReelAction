document.addEventListener('DOMContentLoaded', async () => {
    const carouselTrack = document.querySelector('.carousel-track');
    const prevButton = document.createElement('button');
    const nextButton = document.createElement('button');
    const adminControls = document.querySelector('.admin-controls');
    const uploadInput = document.getElementById('imageUpload');
    const uploadButton = document.getElementById('uploadButton');
    const uploadStatus = document.getElementById('uploadStatus');

    let isAdmin = false;
    let currentIndex = 0;
    let imageElements = [];

    // ✅ Check authentication status
    try {
        const authResponse = await fetch('/auth-status');
        const authData = await authResponse.json();
        isAdmin = authData.isAuthenticated;

        if (isAdmin) {
            adminControls.style.display = 'block';
        }
    } catch (error) {
        console.error('Error checking auth status:', error);
    }

    // ✅ Fetch images from the server
    try {
        const response = await fetch('/about/carousel-images');
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

        const imagePaths = await response.json();
        if (imagePaths.length === 0) {
            carouselTrack.innerHTML = '<p>No images available.</p>';
            return;
        }

        carouselTrack.innerHTML = '';

        imagePaths.forEach((src, index) => {
            const imgContainer = document.createElement('div');
            imgContainer.classList.add('carousel-image-container');
            imgContainer.style.display = index === 0 ? 'block' : 'none'; // Show only the first image

            const img = document.createElement('img');
            img.src = src;
            img.alt = 'Fishing Adventure';
            img.loading = 'lazy';
            img.onerror = () => { img.src = '/images/placeholder.jpg'; };

            imgContainer.appendChild(img);
            imageElements.push(imgContainer);
            carouselTrack.appendChild(imgContainer);

            if (isAdmin) {
                const deleteButton = document.createElement('button');
                deleteButton.innerText = 'Delete';
                deleteButton.classList.add('delete-button');
                deleteButton.onclick = async () => {
                    if (confirm('Are you sure you want to delete this image?')) {
                        await deleteImage(src);
                        imgContainer.remove();
                        imageElements.splice(index, 1);
                        showImage(currentIndex); // Ensure correct display after deletion
                    }
                };
                imgContainer.appendChild(deleteButton);
            }
        });

        // ✅ Add arrow buttons for navigation
        prevButton.innerText = '⮜';
        prevButton.classList.add('carousel-arrow', 'left-arrow');
        nextButton.innerText = '⮞';
        nextButton.classList.add('carousel-arrow', 'right-arrow');

        carouselTrack.parentElement.appendChild(prevButton);
        carouselTrack.parentElement.appendChild(nextButton);

        prevButton.addEventListener('click', () => {
            currentIndex = (currentIndex - 1 + imageElements.length) % imageElements.length;
            showImage(currentIndex);
        });

        nextButton.addEventListener('click', () => {
            currentIndex = (currentIndex + 1) % imageElements.length;
            showImage(currentIndex);
        });

        function showImage(index) {
            imageElements.forEach((img, i) => {
                img.style.display = i === index ? 'block' : 'none';
            });
        }

    } catch (error) {
        console.error('Error fetching images:', error);
        carouselTrack.innerHTML = '<p>Failed to load images.</p>';
    }

    // ✅ Admin Upload Feature
    if (isAdmin) {
        uploadButton.addEventListener('click', async () => {
            const file = uploadInput.files[0];
            if (!file) {
                alert('Please select an image to upload.');
                return;
            }

            const formData = new FormData();
            formData.append('image', file);

            try {
                const uploadResponse = await fetch('/about/upload-image', {
                    method: 'POST',
                    body: formData
                });

                const result = await uploadResponse.json();
                if (uploadResponse.ok) {
                    uploadStatus.innerText = 'Image uploaded successfully!';
                    setTimeout(() => window.location.reload(), 1500);
                } else {
                    uploadStatus.innerText = `Error: ${result.error}`;
                }
            } catch (error) {
                console.error('Upload error:', error);
                uploadStatus.innerText = 'Upload failed.';
            }
        });
    }

    async function deleteImage(imagePath) {
        try {
            const response = await fetch('/about/delete-image', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imagePath })
            });

            const result = await response.json();
            if (!response.ok) {
                alert(`Error: ${result.error}`);
            } else {
                alert('Image deleted successfully!');
            }
        } catch (error) {
            console.error('Error deleting image:', error);
            alert('Failed to delete image.');
        }
    }
});

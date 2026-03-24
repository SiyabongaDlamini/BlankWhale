document.addEventListener('DOMContentLoaded', () => {
    // GSAP Entrance Animations
    gsap.to('.reveal-text', {
        opacity: 1,
        y: 0,
        duration: 1,
        stagger: 0.2,
        ease: 'power3.out'
    });

    gsap.to('.reveal-fade', {
        opacity: 1,
        duration: 1.5,
        delay: 0.6,
        ease: 'power2.out'
    });

    // OS Detection to update Hero button
    const heroBtn = document.getElementById('hero-download-btn');
    const userAgent = navigator.userAgent.toLowerCase();

    if (userAgent.indexOf('win') !== -1) {
        heroBtn.textContent = 'Join Windows Waitlist';
        heroBtn.href = '#download';
    } else if (userAgent.indexOf('linux') !== -1) {
        heroBtn.textContent = 'Linux (Coming Soon)';
        heroBtn.href = '#download';
    }

    // Scroll reveal for features
    const cards = document.querySelectorAll('.feature-card');
    cards.forEach((card, index) => {
        gsap.from(card, {
            scrollTrigger: {
                trigger: card,
                start: 'top 85%',
            },
            opacity: 0,
            y: 30,
            duration: 0.8,
            delay: index * 0.1,
            ease: 'power2.out'
        });
    });

    // Subtle parallax for hero visual
    const visual = document.querySelector('.hero-visual');
    window.addEventListener('mousemove', (e) => {
        const x = (e.clientX / window.innerWidth - 0.5) * 20;
        const y = (e.clientY / window.innerHeight - 0.5) * 20;
        gsap.to(visual, {
            x: x,
            y: y,
            duration: 1,
            ease: 'power2.out'
        });
    });
});

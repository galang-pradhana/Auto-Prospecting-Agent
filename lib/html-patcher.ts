import * as cheerio from 'cheerio';

export function patchHtmlWithBrandData(dummyHtml: string, brandData: any): string {
    const $ = cheerio.load(dummyHtml);

    // Helper to safely replace text if element exists
    const replaceText = (selector: string, text: string | undefined) => {
        if (text && $(selector).length) {
            $(selector).text(text);
        }
    };

    // Helper to safely set attribute if element exists
    const setAttr = (selector: string, attr: string, value: string | undefined) => {
        if (value && $(selector).length) {
            $(selector).attr(attr, value);
        }
    };

    if (!brandData) return dummyHtml;

    // --- Archetype & Visual DNA ---
    const styleDNA = brandData.style_dna || {};
    const archetype = styleDNA.selected_archetype || 'AI-driven';
    
    // Normalize archetype to class name
    const archetypeClass = `archetype-${archetype.toLowerCase().replace(/\s+/g, '-')}`;
    $('body').addClass(archetypeClass).attr('data-archetype', archetype);

    // Inject archetype variables if they exist in a <style id="archetype-styles"> tag
    // Or just ensure they are available for CSS in the template

    // --- Meta & General ---
    if (brandData.meta) {
        replaceText('title', `${brandData.meta.business_name} - ${brandData.meta.category}`);
        setAttr('meta[name="description"]', 'content', `Welcome to ${brandData.meta.business_name}, your trusted ${brandData.meta.category}.`);
        
        // Target placeholders like {{gmaps.name}} or elements with specific data attributes if present
        $('[data-content="business-name"]').text(brandData.meta.business_name);
        $('[data-content="phone"]').text(brandData.meta.phone);
        $('[data-content="address"]').text(brandData.meta.address_short);
        setAttr('[data-content="whatsapp-link"]', 'href', brandData.meta.whatsapp_url);
    }

    // --- Navbar ---
    if (brandData.navbar) {
        replaceText('nav .brand-name, #navbar .logo-text, header .logo', brandData.navbar.brand_name || brandData.meta?.business_name);
        replaceText('nav a.cta-button, #navbar a.cta, header .btn-primary', brandData.navbar.cta_text);
    }

    // --- Hero ---
    if (brandData.hero) {
        replaceText('#hero h1, .hero-section h1, header h1', brandData.hero.headline);
        replaceText('#hero h2, #hero .subheadline, .hero-section p.lead', brandData.hero.subheadline);
        replaceText('#hero p:not(.lead):not(.subheadline)', brandData.hero.description);
        replaceText('#hero a.btn-primary, .hero-section .cta-primary', brandData.hero.cta_primary);
        replaceText('#hero a.btn-secondary, .hero-section .cta-secondary', brandData.hero.cta_secondary);
    }

    // --- Trust Bar / Stats ---
    if (brandData.trust_bar) {
        const stats = [brandData.trust_bar.stat_1, brandData.trust_bar.stat_2, brandData.trust_bar.stat_3, brandData.trust_bar.stat_4].filter(Boolean);
        const statElements = $('#trust-bar .stat-item, .stats-section .stat');
        statElements.each((i, el) => {
            if (stats[i]) {
                $(el).find('.stat-value, h3, strong').text(stats[i].value);
                $(el).find('.stat-label, p, span').text(stats[i].label);
            }
        });
    }

    // --- About ---
    if (brandData.about) {
        replaceText('#about h2, .about-section h2', brandData.about.section_title);
        replaceText('#about p, .about-section p.story', brandData.about.story);
    }

    // --- Services ---
    if (brandData.services) {
        replaceText('#services h2, .services-section h2', brandData.services.section_title);
        replaceText('#services .subtitle, .services-section p.lead', brandData.services.section_subtitle);
        
        const serviceElements = $('#services .service-card, .services-section .item');
        if (brandData.services.items && Array.isArray(brandData.services.items)) {
            serviceElements.each((i, el) => {
                if (brandData.services.items[i]) {
                    $(el).find('h3, .service-title').text(brandData.services.items[i].name);
                    $(el).find('p, .service-desc').text(brandData.services.items[i].description);
                }
            });
        }
    }

    // --- USP Block ---
    if (brandData.usp_block) {
        replaceText('#usp h2, .usp-section h2, #features h2', brandData.usp_block.section_title);
        
        const uspElements = $('#usp .usp-item, .usp-section .feature, #features .feature-card');
        if (brandData.usp_block.points && Array.isArray(brandData.usp_block.points)) {
            uspElements.each((i, el) => {
                if (brandData.usp_block.points[i]) {
                    $(el).find('h3, .feature-title').text(brandData.usp_block.points[i].title);
                    $(el).find('p, .feature-desc').text(brandData.usp_block.points[i].description);
                }
            });
        }
    }

    // --- Testimonials ---
    if (brandData.testimonials) {
        replaceText('#testimonials h2, .reviews-section h2', brandData.testimonials.section_title);
        replaceText('#testimonials .rating-label, .reviews-section .google-rating', brandData.testimonials.google_rating_label);
        replaceText('#testimonials .review-cta, .reviews-section .btn-outline', brandData.testimonials.review_cta);
    }

    // --- Contact ---
    if (brandData.contact) {
        replaceText('#contact h2, .contact-section h2', brandData.contact.section_title);
        replaceText('#contact p.description, .contact-section .intro', brandData.contact.description);
        replaceText('#contact a.wa-btn, .contact-section .btn-whatsapp', brandData.contact.whatsapp_cta);
        replaceText('#contact .hours-label', brandData.contact.hours_label);
        replaceText('#contact .location-label', brandData.contact.location_label);
    }

    // --- Footer ---
    if (brandData.footer) {
        replaceText('footer .tagline, #footer p.motto', brandData.footer.tagline);
        replaceText('footer .copyright, #footer .copy', brandData.footer.copyright);
    }

    // Return the updated HTML
    return $.html();
}

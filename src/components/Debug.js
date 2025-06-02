import sampleLinks from '../schema/sample_links.json';

export default function DebugPage() {
    return (
        <div style={{ padding: '20px' }}>
            <h1>Links for Debug Quick Redirect</h1>
            {
                [...sampleLinks.intermediate_page, ...sampleLinks.result_page].map((item, index) => (
                    <div key={index}>
                        <a href={item.link} target="_blank" rel="noopener noreferrer">
                            {item.link}
                        </a>
                        <ul>
                            {Object.entries(item.dictionary).map(([key, value], linkIndex) => (
                                <li key={linkIndex}>
                                    {key}: {value}
                                </li>
                            ))}
                        </ul>
                    </div>
                ))
            }
        </div>
    );
}
import sampleLinks from '../schema/sample_links.json';

export default function DebugPage() {
    return (
        <div style={{ padding: '20px', width: '1440px' }}>
            <h1>Links for Debug Quick Redirect</h1>
            <h3>Intermediate Page:</h3>
            {
                sampleLinks.intermediate_page.map((item, index) => (
                    <div key={index}>
                        <a href={item.link} target="_blank" rel="noopener noreferrer" style={{
                            wordWrap: 'break-word',
                            maxWidth: '100%',
                        }}>
                            {item.link}
                        </a>
                        <ul>
                            {Object.entries(item.dictionary).map(([key, value], linkIndex) => (
                                <li key={linkIndex}>
                                    {key}: {value}
                                </li>
                            ))}
                        </ul>
                        {item['$comment'] && (
                            <p style={{ color: 'red' }}>
                                {item['$comment']}
                            </p>
                        )}
                    </div>
                ))
            }
            <h3>Result Page:</h3>
            {
                sampleLinks.result_page.map((item, index) => (
                    <div key={index}>
                        <a href={item.link} target="_blank" rel="noopener noreferrer" style={{
                            wordWrap: 'break-word',
                            maxWidth: '100%',
                        }}>
                            {item.link}
                        </a>
                        <ul>
                            {Object.entries(item.dictionary).map(([key, value], linkIndex) => (
                                <li key={linkIndex}>
                                    {key}: {value}
                                </li>
                            ))}
                        </ul>
                        {item['$comment'] && (
                            <p style={{ color: 'red' }}>
                                {item['$comment']}
                            </p>
                        )}
                    </div>
                ))
            }
        </div>
    );
}
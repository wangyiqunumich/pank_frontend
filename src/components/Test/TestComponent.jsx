import {useState} from "react";
import {Test} from "../../service/Test";

export const TestComponent = () => {
    const [returnedValue, setReturnedValue] = useState('Initial');
    let testClassInstance = new Test();
    return <div>
        <button onClick={() => {
            const testReturnValue = testClassInstance.testConnection('string to test')
            console.log(testReturnValue);
            setReturnedValue(testReturnValue);
        }}>Test</button>
    </div>
};